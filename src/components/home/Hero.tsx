"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Flap } from "@/components/flap/Flap";
import { reachableFrom, STATIONS } from "@/lib/network";
import { addDays, formatDay } from "@/lib/time";
import { SunsetScene } from "./SunsetScene";
import styles from "./Hero.module.css";

/** Trips the board shows while nobody's touching it. */
const IDLE_TRIPS: [string, string][] = [
  ["paris", "vienna"],
  ["lisbon", "paris"],
  ["stockholm", "berlin"],
  ["rome", "palermo"],
  ["vienna", "split"],
  ["budapest", "istanbul"],
  ["zurich", "naples"],
  ["copenhagen", "prague"],
];

const SLOTS = 10;
const IDLE_MS = 3800;
const ALL_CITIES = Object.values(STATIONS).sort((a, b) => a.city.localeCompare(b.city));

/** "Tue 3 Nov" becomes a tear-off: the day on top, the date underneath. */
function dayLabel(date: string, today: string) {
  const [weekday, ...rest] = formatDay(date, "short").split(" ");
  const top = date === today ? "Tonight" : date === addDays(today, 1) ? "Tomorrow" : weekday;
  return [top, rest.join(" ")];
}

function CityPicker({
  id,
  label,
  cities,
  selected,
  onPick,
  onClose,
}: {
  id: string;
  label: string;
  cities: { id: string; city: string; country: string }[];
  selected: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>("[aria-selected='true'], button")?.focus();
  }, []);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const options = [...(panel.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const at = options.indexOf(document.activeElement as HTMLButtonElement);
    options[(at + keys[event.key] + options.length) % options.length]?.focus();
  }

  return (
    <div
      id={id}
      ref={panel}
      className={styles.picker}
      role="listbox"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {cities.map((city) => (
        <button
          key={city.id}
          type="button"
          role="option"
          aria-selected={city.id === selected}
          className={styles.option}
          onClick={() => onPick(city.id)}
        >
          <span className={styles.optionCity}>{city.city}</span>
          <span className={styles.optionCountry}>{city.country}</span>
        </button>
      ))}
    </div>
  );
}

export function Hero({ today, nav }: { today: string; nav: React.ReactNode }) {
  const router = useRouter();
  const [trip, setTrip] = useState(IDLE_TRIPS[0]);
  const [date, setDate] = useState(today);
  const [open, setOpen] = useState<"from" | "to" | null>(null);
  const [touched, setTouched] = useState(false);
  const root = useRef<HTMLFormElement>(null);

  const [from, to] = trip;
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  useEffect(() => {
    if (touched) return;
    let at = 0;
    const timer = setInterval(() => {
      at = (at + 1) % IDLE_TRIPS.length;
      setTrip(IDLE_TRIPS[at]);
    }, IDLE_MS);
    return () => clearInterval(timer);
  }, [touched]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  function pickFrom(id: string) {
    const reachable = reachableFrom(id);
    const nextTo = reachable.some((s) => s.id === to) ? to : reachable[reachable.length - 1].id;
    setTrip([id, nextTo]);
    setOpen("to");
  }

  function pickTo(id: string) {
    setTrip([from, id]);
    setOpen(null);
  }

  function openPicker(which: "from" | "to") {
    setTouched(true);
    setOpen((current) => (current === which ? null : which));
  }

  return (
    <section className={styles.hero}>
      <div className={styles.sky} aria-hidden="true" />
      <SunsetScene className={styles.scene} />

      {nav}

      <form
        ref={root}
        className={styles.board}
        action="/search"
        method="get"
        onSubmit={(event) => {
          event.preventDefault();
          router.push(`/search?from=${from}&to=${to}&date=${date}`);
        }}
      >
        <h1 className="visually-hidden">Morrow: go to bed in one city, wake up in another.</h1>
        <input type="hidden" name="from" value={from} />
        <input type="hidden" name="to" value={to} />

        <div className={styles.line}>
          <span className={`sign ${styles.phrase}`} aria-hidden="true">
            Go to bed in
          </span>
          <button
            type="button"
            className={styles.cityButton}
            aria-haspopup="listbox"
            aria-expanded={open === "from"}
            aria-controls={open === "from" ? "picker-from" : undefined}
            aria-label={`Leaving from ${STATIONS[from].city}. Change city.`}
            onClick={() => openPicker("from")}
          >
            <Flap text={STATIONS[from].city} slots={SLOTS} />
          </button>
          {open === "from" && (
            <CityPicker
              id="picker-from"
              label="Leaving from"
              cities={ALL_CITIES}
              selected={from}
              onPick={pickFrom}
              onClose={() => setOpen(null)}
            />
          )}
        </div>

        <div className={styles.line}>
          <span className={`sign ${styles.phrase}`} aria-hidden="true">
            Wake up in
          </span>
          <button
            type="button"
            className={styles.cityButton}
            aria-haspopup="listbox"
            aria-expanded={open === "to"}
            aria-controls={open === "to" ? "picker-to" : undefined}
            aria-label={`Arriving in ${STATIONS[to].city}. Change city.`}
            onClick={() => openPicker("to")}
          >
            <Flap text={STATIONS[to].city} slots={SLOTS} stagger={46} />
          </button>
          {open === "to" && (
            <CityPicker
              id="picker-to"
              label="Arriving in"
              cities={reachableFrom(from)}
              selected={to}
              onPick={pickTo}
              onClose={() => setOpen(null)}
            />
          )}
        </div>

        <div className={styles.controls}>
          <fieldset className={styles.nights}>
            <legend className="visually-hidden">Which night?</legend>
            {dates.map((value) => {
              const [top, bottom] = dayLabel(value, today);
              return (
                <label key={value} className={styles.night} data-selected={value === date || undefined}>
                  <input
                    type="radio"
                    name="date"
                    value={value}
                    checked={value === date}
                    onChange={() => {
                      setDate(value);
                      setTouched(true);
                    }}
                  />
                  <span className={styles.nightTop}>{top}</span>
                  <span className={styles.nightBottom}>{bottom}</span>
                </label>
              );
            })}
          </fieldset>
          <button type="submit" className={styles.submit}>
            <span>Find a bed</span>
            <svg viewBox="0 0 40 16" aria-hidden="true">
              <path d="M0 8h37M30 1l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.6" />
            </svg>
          </button>
        </div>
      </form>
    </section>
  );
}
