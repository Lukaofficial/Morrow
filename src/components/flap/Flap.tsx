"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import styles from "./Flap.module.css";

/** The order the drum turns in. A real board can't jump straight to a letter. */
const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-+ÄÖÜÇÉ";
const STEP_MS = 72;

function stepsBetween(from: string, to: string, maxSteps: number): string[] {
  const start = DRUM.indexOf(from);
  const end = DRUM.indexOf(to);
  if (start === -1 || end === -1) return [to];
  const distance = (end - start + DRUM.length) % DRUM.length;
  // Long way round? Start partway so a row doesn't take a week to settle.
  const count = Math.min(distance, maxSteps);
  return Array.from({ length: count }, (_, i) => DRUM[(end - count + 1 + i + DRUM.length) % DRUM.length]);
}

function Tile({ char, delay, maxSteps }: { char: string; delay: number; maxSteps: number }) {
  const [shown, setShown] = useState({ current: char, previous: char, flip: 0 });
  const shownRef = useRef(char);

  useEffect(() => {
    if (shownRef.current === char) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = char;
      setShown({ current: char, previous: char, flip: 0 });
      return;
    }
    const steps = stepsBetween(shownRef.current, char, maxSteps);
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      const next = steps[index];
      const previous = shownRef.current;
      shownRef.current = next;
      setShown((s) => ({ current: next, previous, flip: s.flip + 1 }));
      index += 1;
      if (index < steps.length) timer = setTimeout(advance, STEP_MS);
    };
    timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [char, delay, maxSteps]);

  return (
    <span className={styles.tile} aria-hidden="true">
      <span className={`${styles.half} ${styles.top}`}>
        <span>{shown.current}</span>
      </span>
      <span className={`${styles.half} ${styles.bottom}`}>
        <span>{shown.previous}</span>
      </span>
      {shown.flip > 0 && (
        <Fragment key={shown.flip}>
          <span className={`${styles.half} ${styles.top} ${styles.falling}`}>
            <span>{shown.previous}</span>
          </span>
          <span className={`${styles.half} ${styles.bottom} ${styles.landing}`}>
            <span>{shown.current}</span>
          </span>
        </Fragment>
      )}
    </span>
  );
}

/**
 * A row of tiles with a fixed number of slots, the way a real board has one:
 * text shorter than the row leaves blanks, and the layout never shifts.
 */
export function Flap({
  text,
  slots,
  align = "left",
  stagger = 34,
  maxSteps = 9,
  className,
}: {
  text: string;
  slots: number;
  align?: "left" | "right";
  stagger?: number;
  /** Lower this on big boards: every step of every tile is a render. */
  maxSteps?: number;
  className?: string;
}) {
  const clean = text.toUpperCase().slice(0, slots);
  const padded = align === "left" ? clean.padEnd(slots, " ") : clean.padStart(slots, " ");
  return (
    <span className={`${styles.row} ${className ?? ""}`} role="img" aria-label={text}>
      {[...padded].map((char, i) => (
        <Tile key={i} char={char} delay={i * stagger} maxSteps={maxSteps} />
      ))}
    </span>
  );
}
