"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LINES, STATIONS } from "@/lib/network";
import styles from "./NetworkMap.module.css";

/** Where each name sits relative to its dot: dx, dy, anchor. */
const LABELS: Record<string, [number, number, "start" | "middle" | "end"]> = {
  lisbon: [18, 8, "start"],
  salamanca: [-16, 6, "end"],
  bordeaux: [-16, 6, "end"],
  paris: [-18, -8, "end"],
  zurich: [-20, 38, "end"],
  innsbruck: [0, -20, "middle"],
  salzburg: [0, 36, "middle"],
  vienna: [22, 44, "start"],
  milan: [-16, 6, "end"],
  rome: [-16, 12, "end"],
  naples: [18, 0, "start"],
  palermo: [-16, 8, "end"],
  stockholm: [18, 6, "start"],
  copenhagen: [18, 0, "start"],
  hamburg: [-16, 6, "end"],
  berlin: [0, -20, "middle"],
  prague: [18, 6, "start"],
  ljubljana: [-16, 6, "end"],
  zagreb: [18, -10, "start"],
  split: [18, 8, "start"],
  budapest: [0, -20, "middle"],
  belgrade: [18, 6, "start"],
  sofia: [-16, 6, "end"],
  istanbul: [0, -20, "middle"],
};

const INTERCHANGES = new Set(["paris", "zurich", "vienna"]);

const NODES = Object.values(
  LINES.flatMap((line) => line.stops.map((stop) => ({ id: stop.station, x: stop.map[0], y: stop.map[1], line: line.id }))).reduce<
    Record<string, { id: string; x: number; y: number; lines: string[] }>
  >((nodes, stop) => {
    nodes[stop.id] ??= { id: stop.id, x: stop.x, y: stop.y, lines: [] };
    nodes[stop.id].lines.push(stop.line);
    return nodes;
  }, {}),
);

export function NetworkMap() {
  const [active, setActive] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const root = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.section} aria-labelledby="map-heading">
      <div className="wrap">
        <h2 id="map-heading" className={`sign ${styles.title}`}>
          From Lisbon to the Bosphorus
        </h2>
        <div className={styles.layout}>
          <ul className={styles.legend} onMouseLeave={() => setActive(null)}>
            {LINES.map((line) => {
              const ends = [line.stops[0], line.stops[line.stops.length - 1]].map((s) => STATIONS[s.station].city);
              return (
                <li key={line.id}>
                  <Link
                    href={`/lines/${line.id}`}
                    className={styles.legendItem}
                    data-dim={active && active !== line.id ? "" : undefined}
                    onMouseEnter={() => setActive(line.id)}
                    onFocus={() => setActive(line.id)}
                    onBlur={() => setActive(null)}
                  >
                    <span className={styles.swatch} style={{ background: line.colour }} />
                    <span className={styles.legendName}>{line.name}</span>
                    <span className={styles.legendEnds}>
                      {ends[0]} to {ends[1]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <svg
          ref={root}
          className={styles.map}
          data-drawn={drawn || undefined}
          viewBox="0 0 1260 900"
          role="img"
          aria-label="Schematic map of the six Morrow lines, meeting at Paris, Zürich and Vienna."
        >
          {LINES.map((line, i) => (
            <polyline
              key={line.id}
              className={styles.track}
              points={line.path.map(([x, y]) => `${x},${y}`).join(" ")}
              pathLength={1}
              stroke={line.colour}
              data-dim={active && active !== line.id ? "" : undefined}
              style={{ "--i": i } as React.CSSProperties}
              onMouseEnter={() => setActive(line.id)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
          {NODES.map((node) => {
            const [dx, dy, anchor] = LABELS[node.id];
            const dim = active && !node.lines.includes(active);
            const big = INTERCHANGES.has(node.id);
            return (
              <g key={node.id} className={styles.node} data-dim={dim ? "" : undefined}>
                <circle cx={node.x} cy={node.y} r={big ? 14 : 8.5} className={styles.dot} data-big={big || undefined} />
                <text x={node.x + dx} y={node.y + dy} textAnchor={anchor} className={styles.label} data-big={big || undefined}>
                  {STATIONS[node.id].city}
                </text>
              </g>
            );
          })}
          </svg>
        </div>
      </div>
    </section>
  );
}
