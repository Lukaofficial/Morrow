"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Flap } from "@/components/flap/Flap";
import type { BoardRow } from "@/lib/board";
import styles from "./DepartureBoard.module.css";

const POLL_MS = 20000;

function nextDate(row: BoardRow) {
  return `/search?from=${row.fromId}&to=${row.toId}&date=${row.serviceDate}`;
}

const INK: Record<BoardRow["status"], string> = {
  "on-time": "#f4efe2",
  tomorrow: "#a9dcf2",
  boarding: "#ffcf4d",
  delayed: "#ff7a45",
  cancelled: "#ff4f23",
  departed: "#7c7c8e",
};

export function DepartureBoard({ initial, updatedAt }: { initial: BoardRow[]; updatedAt: string }) {
  const [rows, setRows] = useState(initial);
  const [time, setTime] = useState(updatedAt);
  const [live, setLive] = useState(false);
  const root = useRef<HTMLElement>(null);

  // Tiles sit blank until the board scrolls into view, then all flip at once.
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const visibleNow = element.getBoundingClientRect().top < window.innerHeight;
    if (reduced || visibleNow) {
      setLive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch("/api/board", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        setRows(data.rows);
        setTime(data.at);
      } catch {
        // A missed poll is fine; the board just stays as it is until the next one.
      }
    };
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const clock = new Date(time).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Vienna",
  });

  return (
    <section ref={root} className={styles.section} aria-labelledby="board-heading">
      <div className="wrap">
        <header className={styles.header}>
          <h2 id="board-heading" className={`sign ${styles.title}`}>
            What&rsquo;s leaving
          </h2>
          <p className={styles.note}>
            Every train on the network, live from the operations room. Times are local to the city it
            leaves from. Last checked at <span className="tabular">{clock}</span> in Vienna.
          </p>
        </header>

        <div className={styles.frame}>
          <div className={styles.labels} aria-hidden="true">
            <span className={styles.cTime}>Time</span>
            <span className={styles.cTo}>Going to</span>
            <span className={styles.cFrom}>From</span>
            <span className={styles.cLine}>Line</span>
            <span className={styles.cPlat}>Pl</span>
            <span className={styles.cStatus}>Remarks</span>
          </div>
          <ol className={styles.rows}>
            {rows.map((row, index) => (
              <li key={index} style={{ "--flap-ink": INK[row.status] } as React.CSSProperties}>
                <Link
                  href={nextDate(row)}
                  className={styles.row}
                  data-status={row.status}
                  aria-label={`${row.time} ${row.line} from ${row.from} to ${row.to}, platform ${row.platform}, ${row.statusText}`}
                >
                  <span className={styles.cTime}>
                    <Flap text={live ? row.time : ""} slots={5} stagger={14} maxSteps={4} />
                  </span>
                  <span className={styles.cTo}>
                    <Flap text={live ? row.to : ""} slots={10} stagger={14} maxSteps={4} />
                  </span>
                  <span className={styles.cFrom}>
                    <Flap text={live ? row.from : ""} slots={10} stagger={14} maxSteps={4} />
                  </span>
                  <span className={styles.cLine}>
                    <Flap text={live ? row.line : ""} slots={11} stagger={14} maxSteps={4} />
                  </span>
                  <span className={styles.cPlat}>
                    <Flap text={live ? String(row.platform) : ""} slots={2} align="right" stagger={14} maxSteps={4} />
                  </span>
                  <span className={styles.cStatus}>
                    <Flap text={live ? row.statusText : ""} slots={10} stagger={14} maxSteps={4} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
