import { and, eq } from "drizzle-orm";
import { customAlphabet, nanoid } from "nanoid";
import { db, writeTransaction } from "./db/client";
import { auditLog, bookingPlaces, bookings, claims, departures, holds } from "./db/schema";
import { PLACE_BY_ID } from "./formation";
import { Direction, LINE_BY_ID } from "./network";
import { BREAKFAST_CENTS } from "./pricing";
import { journeyOn } from "./time";

// No 0/O, 1/I/L or U: this gets read out over the phone and typed on a platform.
const referenceCode = customAlphabet("23456789ABCDEFGHJKMNPQRSTVWXYZ", 6);

export type BookingDetails = {
  leadName: string;
  email: string;
  travellers: number;
  breakfast: boolean;
  wakeCall: number;
};

export type ConfirmResult =
  | { ok: true; accessToken: string; reference: string }
  | { ok: false; reason: "expired" | "too-many-travellers" | "too-few-travellers" };

function maxTravellers(placeIds: string[]): number {
  return placeIds.reduce((sum, id) => {
    const place = PLACE_BY_ID[id];
    return sum + (place.cabinClass === "suite" || place.cabinClass === "sleeper" ? 2 : 1);
  }, 0);
}

export async function confirmBooking(
  holdId: string,
  details: BookingDetails,
  now = new Date(),
): Promise<ConfirmResult> {
  return writeTransaction(
    async (tx): Promise<ConfirmResult> => {
      const [hold] = await tx.select().from(holds).where(eq(holds.id, holdId)).limit(1);
      if (!hold || hold.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "expired" };

      const held = await tx.select().from(claims).where(eq(claims.holdId, holdId));
      if (held.length === 0) return { ok: false, reason: "expired" };

      const placeIds = held.map((claim) => claim.placeId);
      if (details.travellers > maxTravellers(placeIds)) return { ok: false, reason: "too-many-travellers" };
      if (details.travellers < 1) return { ok: false, reason: "too-few-travellers" };

      const fares = held.reduce((sum, claim) => sum + claim.priceCents, 0);
      const totalCents = fares + (details.breakfast ? BREAKFAST_CENTS * details.travellers : 0);

      const bookingId = nanoid(16);
      const reference = `MRW-${referenceCode()}`;
      const accessToken = nanoid(32);

      await tx.insert(bookings).values({
        id: bookingId,
        reference,
        accessToken,
        departureId: hold.departureId,
        fromStation: hold.fromStation,
        toStation: hold.toStation,
        leadName: details.leadName,
        email: details.email.toLowerCase(),
        travellers: details.travellers,
        breakfast: details.breakfast,
        wakeCall: details.wakeCall,
        totalCents,
        createdAt: now,
      });

      await tx.insert(bookingPlaces).values(
        held.map((claim) => ({
          bookingId,
          placeId: claim.placeId,
          priceCents: claim.priceCents,
        })),
      );

      await tx
        .update(claims)
        .set({ bookingId, holdId: null })
        .where(eq(claims.holdId, holdId));
      await tx.delete(holds).where(eq(holds.id, holdId));

      await tx.insert(auditLog).values({
        at: now,
        actor: "public",
        action: "booking.confirmed",
        detail: `${reference} on ${hold.departureId}`,
      });

      return { ok: true, accessToken, reference };
    },
  );
}

export async function getTicket(accessToken: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.accessToken, accessToken)).limit(1);
  if (!booking) return null;
  const [departure] = await db.select().from(departures).where(eq(departures.id, booking.departureId)).limit(1);
  if (!departure) return null;
  const places = await db.select().from(bookingPlaces).where(eq(bookingPlaces.bookingId, booking.id));
  const journey = journeyOn(
    LINE_BY_ID[departure.lineId],
    departure.direction as Direction,
    departure.serviceDate,
    booking.fromStation,
    booking.toStation,
  );
  if (!journey) return null;
  return { booking, departure, places, journey };
}

/** Both have to match, and a wrong guess doesn't say which one was wrong. */
export async function findBookingToken(reference: string, email: string) {
  const [row] = await db
    .select({ accessToken: bookings.accessToken })
    .from(bookings)
    .where(
      and(
        eq(bookings.reference, reference.trim().toUpperCase()),
        eq(bookings.email, email.trim().toLowerCase()),
      ),
    )
    .limit(1);
  return row?.accessToken ?? null;
}

export type CancelResult = { ok: true } | { ok: false; reason: "not-found" | "departed" | "already-cancelled" };

export async function cancelBooking(
  where: { accessToken: string } | { id: string },
  actor: "public" | "ops",
  now = new Date(),
): Promise<CancelResult> {
  return writeTransaction(
    async (tx): Promise<CancelResult> => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where("id" in where ? eq(bookings.id, where.id) : eq(bookings.accessToken, where.accessToken))
        .limit(1);
      if (!booking) return { ok: false, reason: "not-found" };
      if (booking.status === "cancelled") return { ok: false, reason: "already-cancelled" };

      const [departure] = await tx.select().from(departures).where(eq(departures.id, booking.departureId)).limit(1);
      const journey = journeyOn(
        LINE_BY_ID[departure.lineId],
        departure.direction as Direction,
        departure.serviceDate,
        booking.fromStation,
        booking.toStation,
      );
      if (journey && journey.from.instant.getTime() <= now.getTime()) return { ok: false, reason: "departed" };

      await tx.update(bookings).set({ status: "cancelled", cancelledAt: now }).where(eq(bookings.id, booking.id));
      // The places go back on sale straight away. booking_places keeps the record.
      await tx.delete(claims).where(eq(claims.bookingId, booking.id));
      await tx.insert(auditLog).values({
        at: now,
        actor,
        action: "booking.cancelled",
        detail: booking.reference,
      });
      return { ok: true };
    },
  );
}
