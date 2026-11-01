import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/site/Footer";
import { Nav } from "@/components/site/Nav";
import { CabinColours } from "@/components/site/cabin-colours";
import { BOOKING_HORIZON_DAYS } from "@/lib/departures";
import { CLASSES } from "@/lib/formation";
import { connections, reachableFrom, STATIONS } from "@/lib/network";
import { formatEuro } from "@/lib/pricing";
import { cheapest, Offer, searchDates } from "@/lib/search";
import { addDays, daysBetween, formatDay, formatDuration, isValidDate, localDate, NETWORK_TZ } from "@/lib/time";
import styles from "./search.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Find a bed" };

type Params = { from?: string; to?: string; date?: string };

function OfferRow({ offer }: { offer: Offer }) {
  const { journey } = offer;
  const from = STATIONS[journey.from.station];
  const to = STATIONS[journey.to.station];
  const cancelled = offer.status === "cancelled";
  const nights = daysBetween(journey.from.date, journey.to.date);
  const start = journey.from.instant.getTime();
  const total = journey.to.instant.getTime() - start;
  const query = `from=${from.id}&to=${to.id}`;

  return (
    <article className={styles.offer} data-cancelled={cancelled || undefined}>
      <header className={styles.times}>
        <div className={styles.end}>
          <p className={`sign tabular ${styles.clock}`}>{journey.from.clock}</p>
          <p className={styles.city}>{from.city}</p>
          <p className={styles.station}>{from.station}</p>
        </div>

        <div className={styles.journey}>
          <p className={styles.lineName}>
            <Link href={`/lines/${journey.line.id}`}>{journey.line.name}</Link>
          </p>
          <ol className={styles.calls} aria-label="Calling at">
            {journey.calls.map((call) => (
              <li
                key={call.station}
                className={styles.call}
                style={{ left: `${((call.instant.getTime() - start) / total) * 100}%` }}
              >
                <span>
                  {STATIONS[call.station].city} <span className="tabular">{call.clock}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className={styles.duration}>
            {formatDuration(journey.minutes)} and {journey.km.toLocaleString("en-GB")} km
            {offer.delayMinutes > 0 && !cancelled && (
              <strong className={styles.delayed}> Running {offer.delayMinutes} minutes late</strong>
            )}
          </p>
        </div>

        <div className={`${styles.end} ${styles.endRight}`}>
          <p className={`sign tabular ${styles.clock}`}>
            {journey.to.clock}
            {nights > 0 && <sup className={styles.nextDay}>+{nights}</sup>}
          </p>
          <p className={styles.city}>{to.city}</p>
          <p className={styles.station}>{to.station}</p>
        </div>
      </header>

      {cancelled ? (
        <p className={styles.cancelNote}>
          This train has been cancelled by the operations room. Try another night.
        </p>
      ) : (
        <ul className={styles.fares}>
          {offer.classes.map((fare) => {
            const info = CLASSES[fare.cabinClass];
            const soldOut = fare.free === 0;
            const inner = (
              <>
                <span className={styles.fareName}>{info.name}</span>
                <span className={`sign tabular ${styles.farePrice}`}>{soldOut ? "Full" : formatEuro(fare.fareCents)}</span>
                <span className={styles.fareLeft}>
                  {soldOut
                    ? "Nothing left"
                    : fare.free <= 3
                      ? `Last ${fare.free} ${fare.free === 1 ? info.unit : `${info.unit}s`}`
                      : `${fare.free} left`}
                </span>
              </>
            );
            return (
              <li key={fare.cabinClass}>
                {soldOut ? (
                  <div className={styles.fare} data-sold-out style={{ background: CabinColours[fare.cabinClass] }}>
                    {inner}
                  </div>
                ) : (
                  <Link
                    href={`/book/${offer.departureId}?${query}&class=${fare.cabinClass}`}
                    className={styles.fare}
                    style={{ background: CabinColours[fare.cabinClass] }}
                    aria-label={`${info.name} from ${formatEuro(fare.fareCents)}, ${fare.free} left`}
                  >
                    {inner}
                    <svg className={styles.fareArrow} viewBox="0 0 40 16" aria-hidden="true">
                      <path d="M0 8h37M30 1l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.6" />
                    </svg>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const now = new Date();
  const today = localDate(now, NETWORK_TZ);

  const from = params.from ? STATIONS[params.from] : undefined;
  const to = params.to ? STATIONS[params.to] : undefined;
  if (!from || !to) redirect("/");

  const lastOnSale = addDays(today, BOOKING_HORIZON_DAYS);
  const date = isValidDate(params.date) && params.date >= today && params.date <= lastOnSale ? params.date : today;
  const strip = Array.from({ length: 7 }, (_, i) => addDays(date, i - Math.min(3, daysBetween(today, date))));

  const hasRoute = connections(from.id, to.id).length > 0;
  const results = hasRoute ? await searchDates(from.id, to.id, strip, now) : new Map<string, Offer[]>();
  const offers = results.get(date) ?? [];

  const nextWithTrain = strip.find((d) => d > date && (results.get(d)?.length ?? 0) > 0);

  return (
    <>
      <div className={styles.band}>
        <Nav />
        <div className={`wrap ${styles.heading}`}>
          <h1 className={`sign ${styles.title}`}>
            {from.city} <span aria-label="to">to</span> {to.city}
          </h1>
          <p className={styles.dateLine}>Leaving {formatDay(date)}</p>
        </div>

        {hasRoute && (
          <nav className={`wrap ${styles.strip}`} aria-label="Other nights">
            <ol>
              {strip.map((d) => {
                const dayOffers = results.get(d) ?? [];
                const prices = dayOffers.map(cheapest).filter((p): p is number => p !== null);
                const [weekday, ...rest] = formatDay(d, "short").split(" ");
                return (
                  <li key={d}>
                    <Link
                      href={`/search?from=${from.id}&to=${to.id}&date=${d}`}
                      className={styles.stripDay}
                      data-selected={d === date || undefined}
                      data-empty={prices.length === 0 || undefined}
                      aria-current={d === date ? "date" : undefined}
                    >
                      <span className={styles.stripWeekday}>{d === today ? "Tonight" : weekday}</span>
                      <span className={styles.stripDate}>{rest.join(" ")}</span>
                      <span className={`tabular ${styles.stripPrice}`}>
                        {prices.length > 0 ? `from ${formatEuro(Math.min(...prices))}` : "No train"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </div>

      <main className={styles.results}>
        <div className="wrap">
          {!hasRoute && (
            <div className={styles.empty}>
              <h2 className={`sign ${styles.emptyTitle}`}>We don&rsquo;t go straight there</h2>
              <p className={styles.emptyText}>
                There&rsquo;s no direct Morrow train from {from.city} to {to.city}. From {from.city} you can
                sleep your way to:
              </p>
              <ul className={styles.suggestions}>
                {reachableFrom(from.id).map((s) => (
                  <li key={s.id}>
                    <Link href={`/search?from=${from.id}&to=${s.id}&date=${date}`}>{s.city}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasRoute && offers.length === 0 && (
            <div className={styles.empty}>
              <h2 className={`sign ${styles.emptyTitle}`}>Nothing tonight</h2>
              <p className={styles.emptyText}>
                {date === today ? "Tonight's train has already left, or this line doesn't run today." : `This line doesn't run on ${formatDay(date)}.`}
              </p>
              {nextWithTrain && (
                <Link className={styles.nextLink} href={`/search?from=${from.id}&to=${to.id}&date=${nextWithTrain}`}>
                  The next one leaves on {formatDay(nextWithTrain)}
                </Link>
              )}
            </div>
          )}

          {offers.map((offer) => (
            <OfferRow key={offer.departureId} offer={offer} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
