import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db, writeTransaction } from "./db/client";
import { auditLog, bookingPlaces, bookings, departures } from "./db/schema";
import { ClassLoad, ensureDepartures, loadFactor, loadsFor } from "./departures";
import { CabinClass, CAPACITY } from "./formation";
import { Direction, LINE_BY_ID, LINES, originFor, terminusFor } from "./network";
import { addDays, clock, departureInstant, localDate, NETWORK_TZ } from "./time";

const DAY_MS = 86400000;

export type OpsDeparture = {
  id: string;
  lineId: string;
  lineName: string;
  colour: string;
  from: string;
  to: string;
  time: string;
  serviceDate: string;
  status: "scheduled" | "cancelled";
  delayMinutes: number;
  load: ClassLoad;
  loadFactor: number;
  departed: boolean;
};

function toOpsDeparture(row: typeof departures.$inferSelect, load: ClassLoad, now: Date): OpsDeparture {
  const line = LINE_BY_ID[row.lineId];
  const direction = row.direction as Direction;
  const origin = originFor(line, direction);
  const scheduled = departureInstant(line, direction, row.serviceDate);
  return {
    id: row.id,
    lineId: line.id,
    lineName: line.name,
    colour: line.colour,
    from: origin.city,
    to: terminusFor(line, direction).city,
    time: clock(scheduled, origin.tz),
    serviceDate: row.serviceDate,
    status: row.status,
    delayMinutes: row.delayMinutes,
    load,
    loadFactor: loadFactor(load),
    departed: scheduled.getTime() + row.delayMinutes * 60000 <= now.getTime(),
  };
}

export async function departuresOn(serviceDate: string, now = new Date()): Promise<OpsDeparture[]> {
  await ensureDepartures(serviceDate, serviceDate, now);
  const rows = await db.select().from(departures).where(eq(departures.serviceDate, serviceDate));
  const loads = await loadsFor(rows.map((row) => row.id), now);
  return rows
    .map((row) => toOpsDeparture(row, loads.get(row.id)!, now))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export type DayRevenue = { date: string; revenueCents: number; bookings: number };

/** Sales by the day they were made, in network time. */
export async function revenueByDay(days: number, now = new Date()): Promise<DayRevenue[]> {
  const today = localDate(now, NETWORK_TZ);
  const start = addDays(today, -(days - 1));
  const since = new Date(now.getTime() - (days + 1) * DAY_MS);
  const rows = await db
    .select({ createdAt: bookings.createdAt, totalCents: bookings.totalCents })
    .from(bookings)
    .where(and(gte(bookings.createdAt, since), eq(bookings.status, "confirmed")));

  const totals = new Map<string, DayRevenue>();
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    totals.set(date, { date, revenueCents: 0, bookings: 0 });
  }
  for (const row of rows) {
    const day = totals.get(localDate(row.createdAt, NETWORK_TZ));
    if (day) {
      day.revenueCents += row.totalCents;
      day.bookings += 1;
    }
  }
  return [...totals.values()];
}

export type LinePerformance = {
  lineId: string;
  name: string;
  colour: string;
  departures: number;
  loadFactor: number;
  byClass: Record<CabinClass, number>;
};

/** Average load on each line over the coming week. */
export async function linePerformance(now = new Date()): Promise<LinePerformance[]> {
  const today = localDate(now, NETWORK_TZ);
  const end = addDays(today, 7);
  await ensureDepartures(today, end, now);
  const rows = await db
    .select()
    .from(departures)
    .where(and(gte(departures.serviceDate, today), lt(departures.serviceDate, end), eq(departures.status, "scheduled")));
  const loads = await loadsFor(rows.map((row) => row.id), now);

  return LINES.map((line) => {
    const own = rows.filter((row) => row.lineId === line.id);
    const totals: ClassLoad = { suite: 0, sleeper: 0, couchette: 0, seat: 0 };
    let factor = 0;
    for (const row of own) {
      const load = loads.get(row.id)!;
      factor += loadFactor(load);
      for (const key of Object.keys(totals) as CabinClass[]) totals[key] += load[key];
    }
    const count = Math.max(own.length, 1);
    return {
      lineId: line.id,
      name: line.name,
      colour: line.colour,
      departures: own.length,
      loadFactor: factor / count,
      byClass: {
        suite: totals.suite / (CAPACITY.suite * count),
        sleeper: totals.sleeper / (CAPACITY.sleeper * count),
        couchette: totals.couchette / (CAPACITY.couchette * count),
        seat: totals.seat / (CAPACITY.seat * count),
      },
    };
  }).sort((a, b) => b.loadFactor - a.loadFactor);
}

export async function recentBookings(limit = 10, now = new Date()) {
  const rows = await db
    .select()
    .from(bookings)
    .where(sql`${bookings.createdAt} <= ${now.getTime()}`)
    .orderBy(desc(bookings.createdAt))
    .limit(limit);
  return rows;
}

/** How many bookings came from real visitors rather than the demand simulator. */
export async function realBookingCount() {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookings)
    .where(eq(bookings.synthetic, false));
  return row.count;
}

export async function recentActivity(limit = 8) {
  return db.select().from(auditLog).orderBy(desc(auditLog.at)).limit(limit);
}

export async function setDepartureState(
  id: string,
  change: { delayMinutes?: number; status?: "scheduled" | "cancelled" },
  now = new Date(),
) {
  const [departure] = await db.select().from(departures).where(eq(departures.id, id)).limit(1);
  if (!departure) return false;
  const parts = [
    change.delayMinutes !== undefined ? `delay ${change.delayMinutes} min` : null,
    change.status ? `status ${change.status}` : null,
  ].filter(Boolean);
  await writeTransaction(async (tx) => {
    await tx.update(departures).set(change).where(eq(departures.id, id));
    await tx.insert(auditLog).values({
      at: now,
      actor: "ops",
      action: "departure.updated",
      detail: `${id}: ${parts.join(", ")}`,
    });
  });
  return true;
}

export async function manifest(departureId: string) {
  const rows = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.departureId, departureId), eq(bookings.status, "confirmed")))
    .orderBy(desc(bookings.createdAt));
  if (rows.length === 0) return [];
  const places = await db
    .select()
    .from(bookingPlaces)
    .where(
      inArray(
        bookingPlaces.bookingId,
        rows.map((row) => row.id),
      ),
    );
  return rows.map((booking) => ({
    booking,
    places: places.filter((place) => place.bookingId === booking.id).map((place) => place.placeId),
  }));
}

export async function opsDeparture(id: string, now = new Date()) {
  const [row] = await db.select().from(departures).where(eq(departures.id, id)).limit(1);
  if (!row) return null;
  const loads = await loadsFor([id], now);
  return toOpsDeparture(row, loads.get(id)!, now);
}
