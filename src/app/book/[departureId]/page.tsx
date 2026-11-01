import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TrainMap } from "@/components/booking/TrainMap";
import { Nav } from "@/components/site/Nav";
import { classFree, ensureDepartures, getDeparture, loadsFor, takenPlaces } from "@/lib/departures";
import { CabinClass } from "@/lib/formation";
import { Direction, LINE_BY_ID, STATIONS } from "@/lib/network";
import { fareCents } from "@/lib/pricing";
import { daysBetween, formatDay, formatDuration, isValidDate, journeyOn, localDate, NETWORK_TZ, weekdayOf } from "@/lib/time";
import styles from "./book.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose your place" };

const CLASS_LIST: CabinClass[] = ["suite", "sleeper", "couchette", "seat"];

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ departureId: string }>;
  searchParams: Promise<{ from?: string; to?: string; class?: string }>;
}) {
  const { departureId } = await params;
  const { from, to, class: wantedClass } = await searchParams;

  // Ids embed the service date. Links shared later may point at a day not created yet.
  const embeddedDate = departureId.slice(-10);
  if (isValidDate(embeddedDate)) await ensureDepartures(embeddedDate, embeddedDate);

  const departure = await getDeparture(departureId);
  if (!departure) notFound();

  const line = LINE_BY_ID[departure.lineId];
  const direction = departure.direction as Direction;
  const journey = from && to ? journeyOn(line, direction, departure.serviceDate, from, to) : null;
  if (!journey) notFound();

  const now = new Date();
  if (departure.status === "cancelled" || journey.from.instant.getTime() <= now.getTime()) {
    redirect(`/search?from=${from}&to=${to}&date=${journey.from.date}`);
  }

  const [taken, loads] = await Promise.all([takenPlaces(departureId, now), loadsFor([departureId], now)]);
  const load = loads.get(departureId)!;
  const today = localDate(now, NETWORK_TZ);

  const classes = CLASS_LIST.map((cabinClass) => ({
    cabinClass,
    free: classFree(load, cabinClass),
    fareCents: fareCents({
      cabinClass,
      km: journey.km,
      claimed: load[cabinClass],
      weekday: weekdayOf(departure.serviceDate),
      daysOut: daysBetween(today, journey.from.date),
    }),
  }));

  return (
    <div className={styles.page}>
      <Nav tone="paper" />
      <header className={`wrap ${styles.header}`}>
        <div>
          <h1 className={`sign ${styles.title}`}>
            {STATIONS[journey.from.station].city} to {STATIONS[journey.to.station].city}
          </h1>
          <p className={styles.summary}>
            {line.name}, {formatDay(journey.from.date)}. Leaves at{" "}
            <span className="tabular">{journey.from.clock}</span>, arrives at{" "}
            <span className="tabular">{journey.to.clock}</span>, {formatDuration(journey.minutes)} in all.
          </p>
        </div>
      </header>
      <TrainMap
        departureId={departureId}
        from={journey.from.station}
        to={journey.to.station}
        initialTaken={taken}
        classes={classes}
        initialClass={CLASS_LIST.includes(wantedClass as CabinClass) ? (wantedClass as CabinClass) : undefined}
      />
    </div>
  );
}
