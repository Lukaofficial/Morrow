import Link from "next/link";
import { Poster } from "@/components/art/Posters";
import { LINES, STATIONS } from "@/lib/network";
import { formatDuration } from "@/lib/time";
import styles from "./PosterWall.module.css";

export function PosterWall() {
  return (
    <section className={styles.section} aria-labelledby="lines-heading">
      <div className="wrap">
        <header className={styles.header}>
          <h2 id="lines-heading" className={`sign ${styles.title}`}>
            Six lines,
            <br />
            all of them overnight
          </h2>
          <p className={styles.intro}>
            A line deserves a poster. We couldn&rsquo;t find anyone to draw them, so the timetable
            department did.
          </p>
        </header>
        <ul className={styles.wall}>
          {LINES.map((line) => {
            const first = STATIONS[line.stops[0].station];
            const last = STATIONS[line.stops[line.stops.length - 1].station];
            return (
              <li key={line.id} className={styles.item}>
                <Link href={`/lines/${line.id}`} className={styles.link}>
                  <Poster lineId={line.id} className={styles.poster} />
                  <div className={styles.caption}>
                    <h3 className={styles.name}>{line.name}</h3>
                    <p className={styles.note}>{line.note}</p>
                    <p className={styles.meta}>
                      {first.city} to {last.city}, {formatDuration(line.stops[line.stops.length - 1].at)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
