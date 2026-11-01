"use client";

import { useEffect, useRef } from "react";
import { TrainShape } from "@/components/art/Train";
import { alps, pines, ridge, seeded, stars } from "@/lib/scenery";
import styles from "./NightStory.module.css";

/*
  One night on the Transalpine, played by your scrollbar. The stage is pinned
  while the page scrolls past it, and every frame is derived from one number
  between 0 and 1. Nothing here re-renders React: the frame loop writes straight
  to custom properties and transforms, so it stays smooth on a modest laptop.
*/

const STAGE_H = 800;
const RAIL_Y = 640;

const CHAPTERS = [
  {
    from: 0,
    place: "Gare de l'Est, platform 9",
    body: "Someone shows you to your cabin and doesn't make a speech about it. The blind is up. Paris starts to slide.",
  },
  {
    from: 0.15,
    place: "The dining car, near Troyes",
    body: "A short menu, written by a cook who left Alsace once and didn't care for it. There are eleven tables and you won't need a reservation until you do.",
  },
  {
    from: 0.31,
    place: "Lights down",
    body: "The corridor goes quiet. Blinds come down one window at a time, apart from the man in cabin 14, who has brought a paperback and a torch.",
  },
  {
    from: 0.5,
    place: "Somewhere past Innsbruck",
    body: "The train slows to climb and nobody wakes. If you want a summary of what we do for a living, this is it.",
  },
  {
    from: 0.68,
    place: "Coming into Salzburg",
    body: "Coffee at your door, twenty minutes before you asked for it, because this is the view we'd want you to see.",
  },
  {
    from: 0.87,
    place: "Wien Hauptbahnhof",
    body: "You've crossed four countries and brushed your teeth. It's half past eight and the day is entirely yours.",
  },
];

/** Colour script for the night, as flat poster inks. */
const SCRIPT = [
  { at: 0.0, top: "#ff4f23", low: "#ffc65a", far: "#d9304f", snow: "#ffb59c", mid: "#7f1f55", near: "#2a1140", fg: "#0f1130" },
  { at: 0.14, top: "#b5305f", low: "#ff8a4a", far: "#6f2470", snow: "#ff9d9a", mid: "#4a1a60", near: "#1f0f3e", fg: "#f6f1e5" },
  { at: 0.3, top: "#171b57", low: "#4340b8", far: "#1d1e73", snow: "#6f78e0", mid: "#131454", near: "#0a0b30", fg: "#f6f1e5" },
  { at: 0.56, top: "#070a2b", low: "#232a80", far: "#10165a", snow: "#7f8af0", mid: "#0a0e3f", near: "#05072a", fg: "#f6f1e5" },
  { at: 0.72, top: "#1b2f7c", low: "#e88ea2", far: "#46478f", snow: "#ffc3c0", mid: "#2b2d6f", near: "#101240", fg: "#f6f1e5" },
  { at: 0.86, top: "#6db6e6", low: "#ffd98a", far: "#7ea3c6", snow: "#fff0d8", mid: "#3f7486", near: "#143a48", fg: "#0f1130" },
  { at: 1.0, top: "#a9dcf2", low: "#fff0bd", far: "#9fd2c6", snow: "#ffffff", mid: "#55a08c", near: "#17544e", fg: "#0f1130" },
];

/** Scroll position to minutes after midnight. Ours is a generous clock. */
const TIMELINE: [number, number][] = [
  [0, 20 * 60 + 12],
  [0.15, 21 * 60 + 30],
  [0.31, 23 * 60 + 40],
  [0.42, 24 * 60 + 48],
  [0.5, 28 * 60 + 10],
  [0.68, 30 * 60 + 2],
  [0.87, 32 * 60 + 20],
  [1, 32 * 60 + 36],
];

const ROUTE: [string, number][] = [
  ["Paris", 20 * 60 + 12],
  ["Zürich", 24 * 60 + 48],
  ["Innsbruck", 28 * 60 + 10],
  ["Salzburg", 30 * 60 + 2],
  ["Vienna", 32 * 60 + 36],
];

const hex = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
const PARSED = SCRIPT.map((s) => ({ ...s, rgb: { top: hex(s.top), low: hex(s.low), far: hex(s.far), snow: hex(s.snow), mid: hex(s.mid), near: hex(s.near), fg: hex(s.fg) } }));
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const smooth = (t: number) => t * t * (3 - 2 * t);
const span = (value: number, a: number, b: number) => smooth(clamp((value - a) / (b - a)));

function sampleColours(p: number) {
  let i = 0;
  while (i < PARSED.length - 2 && p > PARSED[i + 1].at) i++;
  const a = PARSED[i];
  const b = PARSED[i + 1];
  const t = clamp((p - a.at) / (b.at - a.at));
  const mix = (key: keyof typeof a.rgb, amount = t) =>
    a.rgb[key].map((v, c) => Math.round(v + (b.rgb[key][c] - v) * amount));
  // Type flips quickly between ink and paper instead of passing through grey on the way.
  const fg = () => mix("fg", span(t, 0.42, 0.58));
  return { mix, fg };
}

function minutesAt(p: number) {
  let i = 0;
  while (i < TIMELINE.length - 2 && p > TIMELINE[i + 1][0]) i++;
  const [a, ma] = TIMELINE[i];
  const [b, mb] = TIMELINE[i + 1];
  return ma + (mb - ma) * clamp((p - a) / (b - a));
}

const LAYER_W = { far: 3600, mid: 4600, near: 6400, fore: 9000 };

// Flat around Paris, the Alps in the middle of the night, then down to the Danube.
const FAR = alps({
  seed: 29,
  width: LAYER_W.far,
  base: 600,
  floor: STAGE_H,
  from: 780,
  to: 2820,
  peaks: 9,
  maxHeight: 430,
});

const MID_PATH = ridge({ seed: 77, width: LAYER_W.mid, base: 540, height: 150, floor: STAGE_H, detail: 7, roughness: 0.5 });
const TREE_PATH = pines({ seed: 19, width: LAYER_W.mid, base: 610, floor: STAGE_H, minHeight: 26, maxHeight: 74, spacing: 46 });

/** A terminus: long wings either side of a pavilion with a great fan window. */
function Terminus({ x, name }: { x: number; name: string }) {
  const cx = x + 340;
  const eaves = RAIL_Y - 196;
  const fan = 118;
  const spokes = [-60, -30, 0, 30, 60];
  const bays = Array.from({ length: 14 }, (_, i) => i).filter((i) => i < 4 || i > 9);
  return (
    <g>
      <path
        fill="var(--mid)"
        d={`M${x} ${RAIL_Y}V${RAIL_Y - 128}H${cx - 150}V${eaves}H${cx - 142}a142 142 0 0 1 284 0H${cx + 150}V${RAIL_Y - 128}H${x + 680}V${RAIL_Y}Z`}
      />
      <g opacity="var(--shed-lights)">
        <path d={`M${cx - fan} ${eaves}a${fan} ${fan} 0 0 1 ${fan * 2} 0Z`} fill="#ffcf4d" />
        {spokes.map((angle) => {
          const r = (angle * Math.PI) / 180;
          return (
            <path
              key={angle}
              d={`M${cx} ${eaves}L${(cx + Math.sin(r) * fan).toFixed(1)} ${(eaves - Math.cos(r) * fan).toFixed(1)}`}
              stroke="var(--mid)"
              strokeWidth="5"
            />
          );
        })}
        {bays.map((i) => (
          <path key={i} d={`M${x + 22 + i * 47} ${RAIL_Y - 62}v-36a13 13 0 0 1 26 0v36Z`} fill="#ffcf4d" />
        ))}
        <text x={cx} y={eaves + 58} textAnchor="middle" className={styles.shedName} fill="#ffcf4d">
          {name}
        </text>
      </g>
    </g>
  );
}

function NearLayer() {
  const sleepers = Array.from({ length: Math.floor(LAYER_W.near / 44) }, (_, i) => `M${i * 44} ${RAIL_Y + 6}v9`).join("");
  return (
    <svg className={styles.layer} data-layer="near" viewBox={`0 0 ${LAYER_W.near} ${STAGE_H}`} style={{ aspectRatio: `${LAYER_W.near} / ${STAGE_H}` }} aria-hidden="true">
      <Terminus x={260} name="Paris Est" />
      <Terminus x={LAYER_W.near - 1000} name="Wien Hbf" />
      <rect x="0" y={RAIL_Y} width={LAYER_W.near} height={STAGE_H - RAIL_Y} fill="var(--near)" />
      {/* Sleepers, the fastest thing in the picture. */}
      <path d={sleepers} stroke="var(--mid)" strokeWidth="10" />
    </svg>
  );
}

function ForeLayer() {
  const poles = Array.from({ length: 22 }, (_, i) => 500 + i * 410);
  return (
    <svg className={styles.layer} data-layer="fore" viewBox={`0 0 ${LAYER_W.fore} ${STAGE_H}`} style={{ aspectRatio: `${LAYER_W.fore} / ${STAGE_H}` }} aria-hidden="true">
      {poles.map((x) => (
        <g key={x} fill="var(--near)">
          <rect x={x} y="330" width="9" height="470" />
          <rect x={x - 30} y="352" width="69" height="6" />
          <path d={`M${x + 4} 354Q${x + 205} 400 ${x + 414} 354`} fill="none" stroke="var(--near)" strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}

const CARRIAGES = 7;
// Kept clear of the corner where the chapter text sits.
const STARS = stars(91, 150, 1600, 620).filter(([x, y]) => !(x > 1060 && y < 230));

export function NightStory() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const dot = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = root.current;
    const pinned = stage.current;
    if (!section || !pinned) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const layers = [...pinned.querySelectorAll<SVGElement>("[data-layer]")];
    const chapters = [...pinned.querySelectorAll<HTMLElement>("[data-chapter]")];
    const random = seeded(7);
    // Every window gets its own bedtime and its own alarm.
    const windows = [...pinned.querySelectorAll<SVGRectElement>("[data-window]")].map((el) => ({
      el,
      off: 0.3 + random() * 0.17,
      on: 0.67 + random() * 0.19,
      // A couple of people stay up all night in every carriage.
      owl: random() > 0.94,
      lit: true,
    }));

    let frame = 0;
    let lastChapter = -1;

    const render = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const p = clamp(-rect.top / (rect.height - window.innerHeight));
      const stageWidth = pinned.offsetWidth;
      const { style } = pinned;
      const { mix, fg } = sampleColours(p);

      const top = mix("top");
      const low = mix("low");
      for (let band = 0; band < 6; band++) {
        const t = band / 5;
        style.setProperty(`--b${band}`, `rgb(${top.map((v, c) => Math.round(v + (low[c] - v) * t)).join(" ")})`);
      }
      style.setProperty("--far", `rgb(${mix("far").join(" ")})`);
      style.setProperty("--mid", `rgb(${mix("mid").join(" ")})`);
      style.setProperty("--near", `rgb(${mix("near").join(" ")})`);
      style.setProperty("--snow", `rgb(${mix("snow").join(" ")})`);
      style.setProperty("--fg", `rgb(${fg().join(" ")})`);
      style.setProperty("--star", String(span(p, 0.2, 0.34) * (1 - span(p, 0.74, 0.86))));
      style.setProperty("--shed-lights", String(1 - span(p, 0.12, 0.2) + span(p, 0.88, 0.96)));

      for (const layer of layers) {
        const travel = layer.getBoundingClientRect().width - stageWidth;
        layer.style.transform = `translate3d(${(-p * travel).toFixed(1)}px,0,0)`;
      }

      const h = pinned.offsetHeight;
      const w = stageWidth;
      // Sun goes down.
      const sunset = span(p, 0, 0.17);
      const dawn = span(p, 0.8, 1);
      const sunX = p < 0.5 ? w * 0.74 : w * (0.42 + 0.2 * dawn);
      const sunY = p < 0.5 ? h * (0.46 + 0.5 * sunset) : h * (0.98 - 0.62 * dawn);
      style.setProperty("--sun", `translate3d(${sunX.toFixed(1)}px,${sunY.toFixed(1)}px,0)`);
      // Moon goes over.
      // Moon comes up from behind the hills after dark and sets again before the sun's up.
      const moon = clamp((p - 0.17) / 0.62);
      const moonX = w * (0.9 - 0.78 * moon);
      const moonY = h * (0.98 - 0.56 * Math.sin(Math.PI * moon));
      style.setProperty("--moon", `translate3d(${moonX.toFixed(1)}px,${moonY.toFixed(1)}px,0)`);

      const minutes = minutesAt(p);
      const hh = Math.floor(minutes / 60) % 24;
      const mm = Math.floor(minutes % 60);
      if (clockRef.current) {
        clockRef.current.textContent = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      }
      if (dot.current) {
        const start = ROUTE[0][1];
        const end = ROUTE[ROUTE.length - 1][1];
        dot.current.style.left = `${(((minutes - start) / (end - start)) * 100).toFixed(2)}%`;
      }

      let chapter = 0;
      CHAPTERS.forEach((c, i) => {
        if (p >= c.from) chapter = i;
      });
      if (chapter !== lastChapter) {
        chapters.forEach((el, i) => el.toggleAttribute("data-active", i === chapter));
        lastChapter = chapter;
      }

      for (const win of windows) {
        const lit = win.owl || p < win.off || p > win.on;
        if (lit !== win.lit) {
          win.el.style.fill = lit ? "" : "var(--dark-window)";
          win.lit = lit;
        }
      }
    };

    const request = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    render();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={root} className={styles.story} aria-label="One night on the Transalpine, from Paris to Vienna">
      <div ref={stage} className={styles.stage}>
        <div className={styles.sky} aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((band) => (
            <span key={band} style={{ background: `var(--b${band})` }} />
          ))}
        </div>

        <svg className={styles.stars} viewBox="0 0 1600 620" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
          {STARS.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#fff6d8" />
          ))}
        </svg>

        <div className={styles.sun} aria-hidden="true" />
        <svg className={styles.moon} viewBox="-52 -52 104 104" aria-hidden="true">
          <path fill="#f6f1e5" d="M18-46.6A50 50 0 1 0 18 46.6 51.2 51.2 0 0 1 18-46.6Z" />
        </svg>

        <div className={styles.scenery} aria-hidden="true">
          <svg className={styles.layer} data-layer="far" viewBox={`0 0 ${LAYER_W.far} ${STAGE_H}`} style={{ aspectRatio: `${LAYER_W.far} / ${STAGE_H}` }}>
            <path d={FAR.ridge} fill="var(--far)" />
            <path d={FAR.snow} fill="var(--snow)" />
          </svg>
          <svg className={styles.layer} data-layer="mid" viewBox={`0 0 ${LAYER_W.mid} ${STAGE_H}`} style={{ aspectRatio: `${LAYER_W.mid} / ${STAGE_H}` }}>
            <path d={MID_PATH} fill="var(--mid)" />
            <path d={TREE_PATH} fill="var(--mid)" />
          </svg>
          <NearLayer />
          <svg className={styles.train} viewBox={`0 0 3200 ${STAGE_H}`} style={{ aspectRatio: `3200 / ${STAGE_H}` }}>
            <g transform={`translate(1760 ${RAIL_Y - 59.4 * 1.5}) scale(1.5)`}>
              <TrainShape carriages={CARRIAGES} fill="var(--near)" windowFill="#ffcf4d" />
            </g>
            <rect x="0" y={RAIL_Y - 1} width="3200" height="3" fill="var(--near)" />
          </svg>
          <ForeLayer />
        </div>

        <div className={styles.copy}>
          <p className={`sign tabular ${styles.clock}`}>
            <span ref={clockRef}>20:12</span>
          </p>
          <div className={styles.chapters}>
            {CHAPTERS.map((chapter, i) => (
              <div key={chapter.place} className={styles.chapter} data-chapter={i} data-active={i === 0 ? "" : undefined}>
                <h3 className={styles.place}>{chapter.place}</h3>
                <p className={styles.body}>{chapter.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.route} aria-hidden="true">
          <div className={styles.routeLine}>
            {ROUTE.map(([name, minutes]) => (
              <span
                key={name}
                className={styles.routeStop}
                style={{ left: `${((minutes - ROUTE[0][1]) / (ROUTE[ROUTE.length - 1][1] - ROUTE[0][1])) * 100}%` }}
              >
                <span>{name}</span>
              </span>
            ))}
            <span ref={dot} className={styles.routeDot} />
          </div>
        </div>
      </div>
    </section>
  );
}
