import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Poster } from "@/components/art/Posters";
import { Footer } from "@/components/site/Footer";
import { Nav } from "@/components/site/Nav";
import { Direction, LINE_BY_ID, Line, LINES, STATIONS, stopsFor, terminusFor } from "@/lib/network";
import { formatEuro } from "@/lib/pricing";
import { cheapest, searchDates } from "@/lib/search";
import { addDays, formatDay, formatDuration, localDate, NETWORK_TZ, stopTimes, weekdayOf } from "@/lib/time";
import styles from "./line.module.css";

export const dynamic = "force-dynamic";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Timetables start on Monday. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const line = LINE_BY_ID[slug];
  return line ? { title: line.name, description: line.note } : {};
}

/** A real date for this direction, for working out clock times across zones and DST. */
function sampleDate(line: Line, direction: Direction, today: string) {
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    if ((direction === "out" ? line.runsOut : line.runsBack)[weekdayOf(date)]) return date;
  }
  return today;
}

function Timetable({ line, direction, today }: { line: Line; direction: Direction; today: string }) {
  const stops = stopsFor(line, direction);
  const date = sampleDate(line, direction, today);
  const times = stopTimes(line, direction, date);
  const runs = direction === "out" ? line.runsOut : line.runsBack;
  const terminus = terminusFor(line, direction);
  const firstDate = times[0].date;

  return (
    <section className={styles.timetable}>
      <h3 className={styles.tableTitle}>Towards {terminus.city}</h3>
      <ul className={styles.days} aria-label="Days this train runs">
        {DISPLAY_ORDER.map((day) => (
          <li key={day} data-runs={runs[day] || undefined} title={DAY_NAMES[day]}>
            <span aria-hidden="true">{DAY_LETTERS[day]}</span>
            <span className="visually-hidden">
              {DAY_NAMES[day]}: {runs[day] ? "runs" : "does not run"}
            </span>
          </li>
        ))}
      </ul>
      <ol className={styles.stops}>
        {stops.map((stop, i) => {
          const time = times[i];
          const nextDay = time.date !== firstDate;
          return (
            <li key={stop.station} className={styles.stop}>
              <span className={`sign tabular ${styles.stopTime}`}>{time.clock}</span>
              <span className={styles.stopCity}>
                {STATIONS[stop.station].city}
                <span className={styles.stopStation}>{STATIONS[stop.station].station}</span>
              </span>
              {nextDay && <span className={styles.nextDayTag}>next day</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default async function LinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const line = LINE_BY_ID[slug];
  if (!line) notFound();

  const now = new Date();
  const today = localDate(now, NETWORK_TZ);
  const first = line.stops[0].station;
  const last = line.stops[line.stops.length - 1].station;
  const dates = Array.from({ length: 10 }, (_, i) => addDays(today, i));
  const results = await searchDates(first, last, dates, now);
  const upcoming = dates
    .flatMap((date) => (results.get(date) ?? []).filter((o) => o.journey.line.id === line.id).map((offer) => ({ date, offer })))
    .slice(0, 5);

  const index = LINES.findIndex((l) => l.id === line.id);
  const next = LINES[(index + 1) % LINES.length];

  return (
    <>
      <div className={styles.page} style={{ "--line": line.colour } as React.CSSProperties}>
        <Nav />
        <main className={`wrap ${styles.layout}`}>
          <div className={styles.posterCol}>
            <Poster lineId={line.id} className={styles.poster} />
          </div>
          <div className={styles.content}>
            <h1 className={`sign ${styles.title}`}>{line.name.replace(/^The /, "")}</h1>
            <p className={styles.note}>{line.note}</p>
            <dl className={styles.facts}>
              <div>
                <dt>End to end</dt>
                <dd className="tabular">{formatDuration(line.stops[line.stops.length - 1].at)}</dd>
              </div>
              <div>
                <dt>Distance</dt>
                <dd className="tabular">{line.stops[line.stops.length - 1].km.toLocaleString("en-GB")} km</dd>
              </div>
              <div>
                <dt>Calls at</dt>
                <dd className="tabular">{line.stops.length} cities</dd>
              </div>
            </dl>
            <div className={styles.story}>
              {line.story.map((paragraph) => (
                <p key={paragraph.slice(0, 20)}>{paragraph}</p>
              ))}
            </div>

            <div className={styles.tables}>
              <Timetable line={line} direction="out" today={today} />
              <Timetable line={line} direction="back" today={today} />
            </div>

            {upcoming.length > 0 && (
              <section className={styles.upcoming} aria-labelledby="upcoming-heading">
                <h2 id="upcoming-heading" className={styles.tableTitle}>
                  Next trains, {STATIONS[first].city} to {STATIONS[last].city}
                </h2>
                <ul>
                  {upcoming.map(({ date, offer }) => {
                    const price = cheapest(offer);
                    return (
                      <li key={offer.departureId}>
                        <Link href={`/search?from=${first}&to=${last}&date=${date}`} className={styles.upcomingRow}>
                          <span>{formatDay(date)}</span>
                          <span className="tabular">{offer.journey.from.clock}</span>
                          <span className={`tabular ${styles.upcomingPrice}`}>
                            {offer.status === "cancelled" ? "Cancelled" : price === null ? "Full" : `from ${formatEuro(price)}`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <Link href={`/lines/${next.id}`} className={styles.next}>
              <span className={styles.nextLabel}>Next line</span>
              <span className={`sign ${styles.nextName}`}>{next.name.replace(/^The /, "")}</span>
            </Link>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
