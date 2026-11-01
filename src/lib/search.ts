import { inArray } from "drizzle-orm";
import { db } from "./db/client";
import { departures } from "./db/schema";
import { classFree, departureId, ensureDepartures, loadsFor } from "./departures";
import { CabinClass } from "./formation";
import { connections, runsOn } from "./network";
import { fareCents } from "./pricing";
import { addDays, daysBetween, Journey, journeyOn, localDate, NETWORK_TZ, weekdayOf } from "./time";

export type ClassOffer = { cabinClass: CabinClass; fareCents: number; free: number };

export type Offer = {
  departureId: string;
  journey: Journey;
  status: "scheduled" | "cancelled";
  delayMinutes: number;
  classes: ClassOffer[];
};

const CLASS_ORDER: CabinClass[] = ["seat", "couchette", "sleeper", "suite"];

/**
 * Offers leaving `fromId` on each of `dates`, as a traveller reads the calendar.
 * A train that started yesterday but calls at Innsbruck at four this morning is
 * a train leaving Innsbruck today, so earlier service dates have to be checked too.
 */
export async function searchDates(
  fromId: string,
  toId: string,
  dates: string[],
  now = new Date(),
): Promise<Map<string, Offer[]>> {
  const results = new Map<string, Offer[]>(dates.map((d) => [d, []]));
  const wanted = new Set(dates);
  const journeys: { id: string; journey: Journey }[] = [];
  const serviceDates = new Set<string>();

  for (const { line, direction } of connections(fromId, toId)) {
    for (const date of dates) {
      for (const back of [0, 1, 2]) {
        const serviceDate = addDays(date, -back);
        if (!runsOn(line, direction, weekdayOf(serviceDate))) continue;
        const journey = journeyOn(line, direction, serviceDate, fromId, toId);
        if (!journey || !wanted.has(journey.from.date)) continue;
        if (journey.from.date !== date) continue;
        if (journey.from.instant.getTime() <= now.getTime()) continue;
        journeys.push({ id: departureId(line.id, direction, serviceDate), journey });
        serviceDates.add(serviceDate);
      }
    }
  }

  if (journeys.length === 0) return results;

  const sorted = [...serviceDates].sort();
  await ensureDepartures(sorted[0], sorted[sorted.length - 1], now);

  const ids = journeys.map((j) => j.id);
  const [rows, loads] = await Promise.all([
    db.select().from(departures).where(inArray(departures.id, ids)),
    loadsFor(ids, now),
  ]);
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const today = localDate(now, NETWORK_TZ);

  for (const { id, journey } of journeys) {
    const row = rowById.get(id);
    const load = loads.get(id);
    if (!row || !load) continue;
    const classes = CLASS_ORDER.map((cabinClass) => ({
      cabinClass,
      free: classFree(load, cabinClass),
      fareCents: fareCents({
        cabinClass,
        km: journey.km,
        claimed: load[cabinClass],
        weekday: weekdayOf(journey.serviceDate),
        daysOut: daysBetween(today, journey.from.date),
      }),
    }));
    results.get(journey.from.date)?.push({
      departureId: id,
      journey,
      status: row.status,
      delayMinutes: row.delayMinutes,
      classes,
    });
  }

  for (const offers of results.values()) {
    offers.sort((a, b) => a.journey.from.instant.getTime() - b.journey.from.instant.getTime());
  }
  return results;
}

/** The cheapest available fare on an offer, or null if the train is sold out. */
export function cheapest(offer: Offer): number | null {
  const open = offer.classes.filter((c) => c.free > 0).map((c) => c.fareCents);
  return open.length > 0 ? Math.min(...open) : null;
}
