import type { DayRevenue } from "@/lib/ops";
import { formatEuro } from "@/lib/pricing";
import { formatDay } from "@/lib/time";
import styles from "./RevenueChart.module.css";

/** A clean axis ceiling: 1, 2, 2.5 or 5 times a power of ten. */
function niceCeiling(value: number) {
  const power = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  const step = [1, 2, 2.5, 5, 10].find((n) => n * power >= value) ?? 10;
  return step * power;
}

function compactEuro(cents: number) {
  const euros = cents / 100;
  if (euros >= 1000) return `€${(euros / 1000).toLocaleString("en-GB", { maximumFractionDigits: 1 })}K`;
  return `€${euros.toLocaleString("en-GB")}`;
}

/**
 * Daily sales as thin columns. Drawn in HTML so text stays crisp at any width,
 * and hover needs no JavaScript: the tooltip is a child of the column, and it
 * opens on keyboard focus as well as on hover. The table beneath holds every value.
 */
export function RevenueChart({ days }: { days: DayRevenue[] }) {
  const max = Math.max(...days.map((d) => d.revenueCents), 1);
  const ceiling = niceCeiling(max);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const peak = days.reduce((a, b) => (b.revenueCents > a.revenueCents ? b : a), days[0]);

  return (
    <figure className={styles.figure}>
      <div className={styles.plot}>
        {ticks.map((t) => (
          <div key={t} className={styles.tick} style={{ bottom: `${t * 100}%` }}>
            <span className="tabular">{compactEuro(ceiling * t)}</span>
          </div>
        ))}
        <ol className={styles.columns}>
          {days.map((day, i) => {
            const share = day.revenueCents / ceiling;
            const labelled = day === peak;
            const isToday = i === days.length - 1;
            const edge = i < 2 ? "start" : i > days.length - 3 ? "end" : undefined;
            const label = formatDay(day.date, "short");
            return (
              <li
                key={day.date}
                className={styles.column}
                tabIndex={0}
                aria-label={`${label}: ${formatEuro(day.revenueCents)} from ${day.bookings} bookings`}
              >
                <span className={styles.bar} style={{ height: `${share * 100}%` }}>
                  {labelled && (
                    <span className={`${styles.barLabel} tabular`} data-edge={edge}>
                      {compactEuro(day.revenueCents)}
                    </span>
                  )}
                </span>
                <span className={styles.tooltip} data-edge={edge} aria-hidden="true">
                  <strong className="tabular">{formatEuro(day.revenueCents)}</strong>
                  <span className="tabular">{day.bookings} bookings</span>
                  <span>{isToday ? `${label}, so far` : label}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <ol className={styles.axis} aria-hidden="true">
        {days.map((day, i) => (
          <li key={day.date}>{i % 2 === (days.length - 1) % 2 ? formatDay(day.date, "short").split(" ").slice(1).join(" ") : ""}</li>
        ))}
      </ol>

      <details className={styles.tableView}>
        <summary>Table view</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Bookings</th>
              <th scope="col">Sales</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <th scope="row">{formatDay(day.date, "short")}</th>
                <td className="tabular">{day.bookings}</td>
                <td className="tabular">{formatEuro(day.revenueCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
