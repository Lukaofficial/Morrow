/**
 * Holding a place. This is the part of the system that has to be right: two
 * people clicking the same berth at the same moment must end with one berth
 * sold, one apology, and no double-booked mattress.
 *
 * Each attempt runs in a write transaction, so attempts are serialised, and the
 * primary key on `claims` backs that up if something ever goes around this code.
 */

import { and, eq, inArray, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, Tx, writeTransaction } from "./db/client";
import { auditLog, claims, departures, holds } from "./db/schema";
import { CabinClass, PLACE_BY_ID } from "./formation";
import { Direction, LINE_BY_ID } from "./network";
import { fareCents } from "./pricing";
import { daysBetween, journeyOn, localDate, NETWORK_TZ, weekdayOf } from "./time";

export const HOLD_MINUTES = 10;
export const MAX_PLACES = 4;

export type HoldRequest = {
  departureId: string;
  placeIds: string[];
  from: string;
  to: string;
};

export type HoldResult =
  | { ok: true; holdId: string; expiresAt: Date }
  | {
      ok: false;
      reason: "unknown-departure" | "invalid-places" | "invalid-journey" | "departed" | "cancelled";
    }
  | { ok: false; reason: "conflict"; conflicts: string[] };

/** Expired holds give their places back here, not on a timer. */
async function purgeExpired(tx: Tx, now: Date) {
  const expired = await tx.select({ id: holds.id }).from(holds).where(lte(holds.expiresAt, now));
  if (expired.length === 0) return;
  const ids = expired.map((row) => row.id);
  await tx.delete(claims).where(inArray(claims.holdId, ids));
  await tx.delete(holds).where(inArray(holds.id, ids));
}

export async function createHold(request: HoldRequest, now = new Date()): Promise<HoldResult> {
  const placeIds = [...new Set(request.placeIds)];
  if (placeIds.length === 0 || placeIds.length > MAX_PLACES) return { ok: false, reason: "invalid-places" };
  if (placeIds.some((id) => !PLACE_BY_ID[id])) return { ok: false, reason: "invalid-places" };

  try {
    return await writeTransaction(
      async (tx): Promise<HoldResult> => {
        const [departure] = await tx
          .select()
          .from(departures)
          .where(eq(departures.id, request.departureId))
          .limit(1);
        if (!departure) return { ok: false, reason: "unknown-departure" };
        if (departure.status === "cancelled") return { ok: false, reason: "cancelled" };

        const line = LINE_BY_ID[departure.lineId];
        const journey = journeyOn(
          line,
          departure.direction as Direction,
          departure.serviceDate,
          request.from,
          request.to,
        );
        if (!journey) return { ok: false, reason: "invalid-journey" };
        if (journey.from.instant.getTime() <= now.getTime()) return { ok: false, reason: "departed" };

        await purgeExpired(tx, now);

        const occupied = await tx
          .select({ placeId: claims.placeId })
          .from(claims)
          .where(eq(claims.departureId, request.departureId));
        const taken = new Set(occupied.map((row) => row.placeId));
        const conflicts = placeIds.filter((id) => taken.has(id));
        if (conflicts.length > 0) return { ok: false, reason: "conflict", conflicts };

        const claimedByClass: Record<CabinClass, number> = { suite: 0, sleeper: 0, couchette: 0, seat: 0 };
        for (const id of taken) {
          const place = PLACE_BY_ID[id];
          if (place) claimedByClass[place.cabinClass] += 1;
        }

        const today = localDate(now, NETWORK_TZ);
        const holdId = nanoid(16);
        const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60000);

        await tx.insert(holds).values({
          id: holdId,
          departureId: request.departureId,
          fromStation: request.from,
          toStation: request.to,
          expiresAt,
        });

        await tx.insert(claims).values(
          placeIds.map((placeId) => ({
            departureId: request.departureId,
            placeId,
            holdId,
            priceCents: fareCents({
              cabinClass: PLACE_BY_ID[placeId].cabinClass,
              km: journey.km,
              claimed: claimedByClass[PLACE_BY_ID[placeId].cabinClass],
              weekday: weekdayOf(departure.serviceDate),
              daysOut: daysBetween(today, journey.from.date),
            }),
          })),
        );

        await tx.insert(auditLog).values({
          at: now,
          actor: "public",
          action: "hold.created",
          detail: `${placeIds.join(", ")} on ${request.departureId}`,
        });

        return { ok: true, holdId, expiresAt };
      },
    );
  } catch (error) {
    // Only reachable if something bypasses the transaction above. The key still holds.
    if (String(error).includes("UNIQUE") || String(error).includes("PRIMARY")) {
      return { ok: false, reason: "conflict", conflicts: placeIds };
    }
    throw error;
  }
}

export async function releaseHold(holdId: string) {
  await writeTransaction(
    async (tx) => {
      await tx.delete(claims).where(and(eq(claims.holdId, holdId)));
      await tx.delete(holds).where(eq(holds.id, holdId));
    },
  );
}

export async function getHold(holdId: string, now = new Date()) {
  const [hold] = await db.select().from(holds).where(eq(holds.id, holdId)).limit(1);
  if (!hold || hold.expiresAt.getTime() <= now.getTime()) return null;
  const [departure] = await db.select().from(departures).where(eq(departures.id, hold.departureId)).limit(1);
  if (!departure) return null;
  const places = await db
    .select({ placeId: claims.placeId, priceCents: claims.priceCents })
    .from(claims)
    .where(eq(claims.holdId, holdId));
  const journey = journeyOn(
    LINE_BY_ID[departure.lineId],
    departure.direction as Direction,
    departure.serviceDate,
    hold.fromStation,
    hold.toStation,
  );
  if (!journey) return null;
  return { hold, departure, places, journey };
}
