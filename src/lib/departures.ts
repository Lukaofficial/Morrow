/**
 * Departures are created lazily, the first time anyone asks about a date. There
 * is no timetable-generation job to schedule or forget about, and the site can
 * sit idle for a year and still have tonight's trains when someone turns up.
 */

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, writeTransaction } from "./db/client";
import { bookingPlaces, bookings, claims, departures, holds } from "./db/schema";
import { syntheticBookingsFor } from "./demand";
import { ALL_PLACES, CabinClass, CAPACITY, PLACE_BY_ID } from "./formation";
import { Direction, LINE_BY_ID, LINES, runsOn } from "./network";
import { addDays, localDate, NETWORK_TZ, weekdayOf } from "./time";

const INSERT_CHUNK = 200;

/** How far ahead tickets go on sale. Also stops a crafted URL from generating years of trains. */
export const BOOKING_HORIZON_DAYS = 120;
const HISTORY_DAYS = 60;

async function inChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    await insert(rows.slice(i, i + INSERT_CHUNK));
  }
}

export function departureId(lineId: string, direction: Direction, serviceDate: string) {
  return `${lineId}-${direction}-${serviceDate}`;
}

const ensuredDates = new Set<string>();

/** Makes sure every train scheduled between two dates exists, passengers included. */
export async function ensureDepartures(from: string, to: string, now = new Date()) {
  const today = localDate(now, NETWORK_TZ);
  const first = addDays(today, -HISTORY_DAYS);
  const last = addDays(today, BOOKING_HORIZON_DAYS);
  const start = from < first ? first : from;
  const end = to > last ? last : to;

  const dates: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) if (!ensuredDates.has(d)) dates.push(d);
  if (dates.length === 0) return;

  const existing = await db
    .select({ id: departures.id })
    .from(departures)
    .where(and(gte(departures.serviceDate, dates[0]), lte(departures.serviceDate, dates[dates.length - 1])));
  const known = new Set(existing.map((row) => row.id));

  const missing: { id: string; lineId: string; direction: Direction; serviceDate: string }[] = [];
  for (const serviceDate of dates) {
    const weekday = weekdayOf(serviceDate);
    for (const line of LINES) {
      for (const direction of ["out", "back"] as const) {
        const id = departureId(line.id, direction, serviceDate);
        if (runsOn(line, direction, weekday) && !known.has(id)) {
          missing.push({ id, lineId: line.id, direction, serviceDate });
        }
      }
    }
  }

  if (missing.length > 0) {
    const generated = missing.flatMap((dep) =>
      syntheticBookingsFor(LINE_BY_ID[dep.lineId], dep.direction, dep.serviceDate, dep.id, today, now).map(
        (booking) => ({ dep, booking }),
      ),
    );

    await writeTransaction(
      async (tx) => {
        await inChunks(missing, (chunk) => tx.insert(departures).values(chunk).onConflictDoNothing());
        await inChunks(generated, (chunk) =>
          tx
            .insert(bookings)
            .values(
              chunk.map(({ dep, booking }) => ({
                id: booking.id,
                reference: booking.reference,
                accessToken: booking.accessToken,
                departureId: dep.id,
                fromStation: booking.fromStation,
                toStation: booking.toStation,
                leadName: booking.leadName,
                email: booking.email,
                travellers: booking.travellers,
                breakfast: booking.breakfast,
                totalCents: booking.totalCents,
                synthetic: true,
                createdAt: booking.createdAt,
              })),
            )
            .onConflictDoNothing(),
        );
        const places = generated.flatMap(({ dep, booking }) =>
          booking.places.map((place) => ({ dep, booking, place })),
        );
        await inChunks(places, (chunk) =>
          tx
            .insert(bookingPlaces)
            .values(
              chunk.map(({ booking, place }) => ({
                bookingId: booking.id,
                placeId: place.placeId,
                priceCents: place.priceCents,
              })),
            )
            .onConflictDoNothing(),
        );
        await inChunks(places, (chunk) =>
          tx
            .insert(claims)
            .values(
              chunk.map(({ dep, booking, place }) => ({
                departureId: dep.id,
                placeId: place.placeId,
                bookingId: booking.id,
                priceCents: place.priceCents,
              })),
            )
            .onConflictDoNothing(),
        );
      },
    );
  }

  for (const d of dates) ensuredDates.add(d);
}

export function forgetEnsuredDates() {
  ensuredDates.clear();
}

export type ClassLoad = Record<CabinClass, number>;

/** Live claims per class, for several departures at once. Expired holds don't count. */
export async function loadsFor(ids: string[], now = new Date()): Promise<Map<string, ClassLoad>> {
  const result = new Map<string, ClassLoad>();
  for (const id of ids) result.set(id, { suite: 0, sleeper: 0, couchette: 0, seat: 0 });
  if (ids.length === 0) return result;

  const rows = await db
    .select({ departureId: claims.departureId, placeId: claims.placeId })
    .from(claims)
    .leftJoin(holds, eq(holds.id, claims.holdId))
    .where(
      and(
        inArray(claims.departureId, ids),
        sql`(${claims.bookingId} is not null or ${holds.expiresAt} > ${now.getTime()})`,
      ),
    );

  for (const row of rows) {
    const place = PLACE_BY_ID[row.placeId];
    const load = result.get(row.departureId);
    if (place && load) load[place.cabinClass] += 1;
  }
  return result;
}

export function loadFactor(load: ClassLoad): number {
  const claimed = load.suite + load.sleeper + load.couchette + load.seat;
  return claimed / ALL_PLACES.length;
}

export function classFree(load: ClassLoad, cabinClass: CabinClass): number {
  return Math.max(0, CAPACITY[cabinClass] - load[cabinClass]);
}

export async function getDeparture(id: string) {
  const [row] = await db.select().from(departures).where(eq(departures.id, id)).limit(1);
  return row ?? null;
}

/** The ids of places currently taken on a departure. */
export async function takenPlaces(id: string, now = new Date()): Promise<string[]> {
  const rows = await db
    .select({ placeId: claims.placeId })
    .from(claims)
    .leftJoin(holds, eq(holds.id, claims.holdId))
    .where(
      and(
        eq(claims.departureId, id),
        sql`(${claims.bookingId} is not null or ${holds.expiresAt} > ${now.getTime()})`,
      ),
    );
  return rows.map((row) => row.placeId);
}
