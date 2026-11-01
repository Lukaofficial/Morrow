import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DepartureControls } from "@/components/ops/DepartureControls";
import { RevenueChart } from "@/components/ops/RevenueChart";
import { SignOut } from "@/components/ops/SignOut";
import { CabinColours } from "@/components/site/cabin-colours";
import { Logo } from "@/components/brand/Logo";
import { isOpsSession } from "@/lib/auth";
import { CabinClass, CLASSES } from "@/lib/formation";
import { STATIONS } from "@/lib/network";
import { departuresOn, linePerformance, realBookingCount, recentActivity, recentBookings, revenueByDay } from "@/lib/ops";
import { formatEuro } from "@/lib/pricing";
import { addDays, clock, formatDay, isValidDate, localDate, NETWORK_TZ } from "@/lib/time";
import styles from "./ops.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Operations room", robots: { index: false } };

const CLASS_COLUMNS: CabinClass[] = ["suite", "sleeper", "couchette", "seat"];

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

/**
 * One hue, light to strong, spread across the range loads actually fall in. It's
 * periwinkle because yellow over this indigo mixes to mud. The number is always
 * printed in the cell, so the tint is never the only way to read a value.
 */
function heat(value: number) {
  const position = Math.min(1, Math.max(0, (value - 0.2) / 0.5));
  return `rgb(143 162 255 / ${(0.08 + position * 0.62).toFixed(2)})`;
}

export default async function OpsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  if (!(await isOpsSession())) redirect("/ops/login");

  const { date: requested } = await searchParams;
  const now = new Date();
  const today = localDate(now, NETWORK_TZ);
  const date = isValidDate(requested) ? requested : today;

  const [trains, revenue, lines, bookings, activity, realCount] = await Promise.all([
    departuresOn(date, now),
    revenueByDay(14, now),
    linePerformance(now),
    recentBookings(7, now),
    recentActivity(8),
    realBookingCount(),
  ]);

  const running = trains.filter((t) => t.status === "scheduled");
  const passengers = running.reduce((sum, t) => sum + t.load.suite + t.load.sleeper + t.load.couchette + t.load.seat, 0);
  const avgLoad = running.reduce((sum, t) => sum + t.loadFactor, 0) / Math.max(running.length, 1);
  const late = running.filter((t) => t.delayMinutes > 0).length;
  const cancelled = trains.length - running.length;

  const lastWeek = revenue.slice(-7).reduce((sum, d) => sum + d.revenueCents, 0);
  const priorWeek = revenue.slice(0, 7).reduce((sum, d) => sum + d.revenueCents, 0);
  const change = priorWeek > 0 ? (lastWeek - priorWeek) / priorWeek : 0;
  const weekBookings = revenue.slice(-7).reduce((sum, d) => sum + d.bookings, 0);

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <div className={`wrap ${styles.barInner}`}>
          <Link href="/" className={styles.barLogo} aria-label="Morrow, public site">
            <Logo />
          </Link>
          <span className={styles.barTitle}>Operations room</span>
          <span className={`tabular ${styles.barClock}`}>{clock(now, NETWORK_TZ)} Vienna</span>
          <Link href="/" className={styles.barLink}>
            Public board
          </Link>
          <SignOut className={styles.barLink} />
        </div>
      </header>

      <main className="wrap">
        <section className={styles.top} aria-label="Summary">
          <div className={styles.hero}>
            <p className={styles.statLabel}>{date === today ? "Places sold on tonight\u2019s trains" : `Places sold, ${formatDay(date, "short")}`}</p>
            <p className={styles.heroValue}>{passengers.toLocaleString("en-GB")}</p>
            <p className={styles.statNote}>
              {running.length} {running.length === 1 ? "train" : "trains"} running, {percent(avgLoad)} full on average
            </p>
          </div>
          <dl className={styles.stats}>
            <div>
              <dt className={styles.statLabel}>Sales, last 7 days</dt>
              <dd className={styles.statValue}>{formatEuro(lastWeek)}</dd>
              <dd className={styles.statNote}>
                {change >= 0 ? "Up" : "Down"} {percent(Math.abs(change))} on the week before
              </dd>
            </div>
            <div>
              <dt className={styles.statLabel}>Bookings, last 7 days</dt>
              <dd className={styles.statValue}>{weekBookings.toLocaleString("en-GB")}</dd>
              <dd className={styles.statNote}>{realCount.toLocaleString("en-GB")} from real visitors, ever</dd>
            </div>
            <div>
              <dt className={styles.statLabel}>Running late</dt>
              <dd className={styles.statValue}>{late}</dd>
              <dd className={styles.statNote}>{cancelled > 0 ? `${cancelled} cancelled` : "Nothing cancelled"}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.panel} aria-labelledby="departures-heading">
          <div className={styles.panelHead}>
            <h2 id="departures-heading" className={styles.panelTitle}>
              {date === today ? "Tonight" : formatDay(date)}
            </h2>
            <nav className={styles.dateNav} aria-label="Choose a day">
              <Link href={`/ops?date=${addDays(date, -1)}`}>Previous</Link>
              <Link href="/ops" aria-current={date === today ? "date" : undefined}>
                Today
              </Link>
              <Link href={`/ops?date=${addDays(date, 1)}`}>Next</Link>
            </nav>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Dep</th>
                  <th scope="col">Train</th>
                  <th scope="col">Route</th>
                  <th scope="col">Load</th>
                  <th scope="col">Status</th>
                  <th scope="col" className={styles.right}>
                    Control
                  </th>
                </tr>
              </thead>
              <tbody>
                {trains.map((train) => {
                  const label = `the ${train.time} ${train.lineName}`;
                  return (
                    <tr key={train.id} data-cancelled={train.status === "cancelled" || undefined}>
                      <td className={`tabular ${styles.time}`}>{train.time}</td>
                      <td>
                        <Link href={`/ops/departures/${train.id}`} className={styles.trainLink}>
                          <span className={styles.lineKey} style={{ background: train.colour }} aria-hidden="true" />
                          {train.lineName}
                        </Link>
                      </td>
                      <td className={styles.route}>
                        {train.from} to {train.to}
                      </td>
                      <td>
                        <span className={styles.meterRow}>
                          <span className={styles.meter} aria-hidden="true">
                            <span style={{ width: percent(train.loadFactor) }} />
                          </span>
                          <span className="tabular">{percent(train.loadFactor)}</span>
                        </span>
                      </td>
                      <td>
                        {train.status === "cancelled" ? (
                          <span className={styles.statusBad}>Cancelled</span>
                        ) : train.delayMinutes > 0 ? (
                          <span className={styles.statusWarn}>{train.delayMinutes} min late</span>
                        ) : train.departed ? (
                          <span className={styles.statusQuiet}>Departed</span>
                        ) : (
                          <span>On time</span>
                        )}
                      </td>
                      <td className={styles.right}>
                        <DepartureControls
                          id={train.id}
                          delayMinutes={train.delayMinutes}
                          status={train.status}
                          departed={train.departed}
                          label={label}
                        />
                      </td>
                    </tr>
                  );
                })}
                {trains.length === 0 && (
                  <tr>
                    <td colSpan={6}>Nothing scheduled.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className={styles.columns}>
          <section className={styles.panel} aria-labelledby="sales-heading">
            <h2 id="sales-heading" className={styles.panelTitle}>
              Sales by day
            </h2>
            <p className={styles.panelNote}>Confirmed bookings over the last 14 days, by the day they were made.</p>
            <RevenueChart days={revenue} />
          </section>

          <section className={styles.panel} aria-labelledby="load-heading">
            <h2 id="load-heading" className={styles.panelTitle}>
              How full, next 7 days
            </h2>
            <p className={styles.panelNote}>Share of places sold. Stronger tint means fuller.</p>
            <div className={styles.tableScroll}>
              <table className={styles.heatTable}>
                <thead>
                  <tr>
                    <th scope="col">Line</th>
                    {CLASS_COLUMNS.map((c) => (
                      <th key={c} scope="col">
                        <span className={styles.classKey} style={{ background: CabinColours[c] }} aria-hidden="true" />
                        {CLASSES[c].name}
                      </th>
                    ))}
                    <th scope="col">All</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.lineId}>
                      <th scope="row">{line.name.replace(/^The /, "")}</th>
                      {CLASS_COLUMNS.map((c) => (
                        <td key={c} className="tabular" style={{ background: heat(line.byClass[c]) }}>
                          {percent(line.byClass[c])}
                        </td>
                      ))}
                      <td className={`tabular ${styles.heatTotal}`}>{percent(line.loadFactor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className={styles.columns}>
          <section className={styles.panel} aria-labelledby="bookings-heading">
            <h2 id="bookings-heading" className={styles.panelTitle}>
              Latest bookings
            </h2>
            <ul className={styles.feed}>
              {bookings.map((booking) => (
                <li key={booking.id}>
                  <span className={styles.feedMain}>
                    {booking.leadName}
                    {booking.synthetic ? <span className={styles.tag}>simulated</span> : <span className={styles.tagReal}>real</span>}
                  </span>
                  <span className={styles.feedSub}>
                    {booking.reference}, {STATIONS[booking.fromStation].city} to {STATIONS[booking.toStation].city}
                  </span>
                  <span className={`tabular ${styles.feedAmount}`}>{formatEuro(booking.totalCents)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.panel} aria-labelledby="activity-heading">
            <h2 id="activity-heading" className={styles.panelTitle}>
              Audit log
            </h2>
            {activity.length === 0 ? (
              <p className={styles.panelNote}>Nothing yet. Delay a train and it shows up here.</p>
            ) : (
              <ul className={styles.feed}>
                {activity.map((entry) => (
                  <li key={entry.id}>
                    <span className={styles.feedMain}>{entry.action}</span>
                    <span className={styles.feedSub}>{entry.detail}</span>
                    <span className={`tabular ${styles.feedAmount} ${styles.feedTime}`}>
                      {clock(entry.at, NETWORK_TZ)} {entry.actor}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
