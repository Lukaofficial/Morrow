"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CabinColours } from "@/components/site/cabin-colours";
import { CabinClass, Car, CLASSES, describePlace, FORMATION, Place, PLACE_BY_ID } from "@/lib/formation";
import { formatEuro } from "@/lib/pricing";
import styles from "./TrainMap.module.css";

const MAX_PLACES = 4;
const POLL_MS = 4000;

type ClassOffer = { cabinClass: CabinClass; free: number; fareCents: number };

type PlaceButtonProps = {
  place: Place;
  taken: Set<string>;
  selected: Set<string>;
  fare: number;
  onToggle: (id: string) => void;
  className?: string;
  children?: React.ReactNode;
};

function PlaceButton({ place, taken, selected, fare, onToggle, className, children }: PlaceButtonProps) {
  const isTaken = taken.has(place.id);
  const isSelected = selected.has(place.id);
  return (
    <button
      type="button"
      className={`${styles.place} ${className ?? ""}`}
      data-state={isSelected ? "selected" : isTaken ? "taken" : "free"}
      disabled={isTaken && !isSelected}
      aria-pressed={isSelected}
      aria-label={`${describePlace(place)}, ${isTaken ? "taken" : formatEuro(fare)}`}
      onClick={() => onToggle(place.id)}
    >
      {children ?? place.label}
    </button>
  );
}

type CarProps = {
  car: Car;
  taken: Set<string>;
  selected: Set<string>;
  fare: Record<CabinClass, number>;
  onToggle: (id: string) => void;
};

function BedGlyph() {
  return (
    <svg className={styles.glyph} viewBox="0 0 44 72" aria-hidden="true">
      <rect x="2" y="2" width="40" height="68" rx="3" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <rect x="8" y="8" width="28" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M2 30h40" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  );
}

function CarBody({ car, taken, selected, fare, onToggle }: CarProps) {
  if (car.kind === "dining") {
    return (
      <div className={`${styles.body} ${styles.dining}`}>
        <div className={styles.tables} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={styles.table}>
              <i />
              <i />
              <b />
              <i />
              <i />
            </span>
          ))}
        </div>
        <p className={styles.diningNote}>Eleven tables, one cook, open until midnight.</p>
      </div>
    );
  }

  if (car.kind === "seat") {
    return (
      <div className={`${styles.body} ${styles.seats}`}>
        {car.places.map((place) => (
          <PlaceButton
            key={place.id}
            place={place}
            taken={taken}
            selected={selected}
            fare={fare.seat}
            onToggle={onToggle}
            className={styles.seat}
          />
        ))}
      </div>
    );
  }

  if (car.kind === "couchette") {
    const compartments = [1, 2, 3, 4, 5, 6];
    return (
      <div className={`${styles.body} ${styles.couchettes}`}>
        <div className={styles.compartments}>
          {compartments.map((n) => (
            <div key={n} className={styles.compartment}>
              {car.places
                .filter((place) => place.group === n)
                .map((place) => (
                  <PlaceButton
                    key={place.id}
                    place={place}
                    taken={taken}
                    selected={selected}
                    fare={fare.couchette}
                    onToggle={onToggle}
                    className={styles.berth}
                  />
                ))}
            </div>
          ))}
        </div>
        <div className={styles.corridor} aria-hidden="true" />
      </div>
    );
  }

  const isSuite = car.kind === "suite";
  return (
    <div className={`${styles.body} ${styles.cabins}`} data-kind={car.kind}>
      <div className={styles.cabinRow}>
        {car.places.map((place) => (
          <PlaceButton
            key={place.id}
            place={place}
            taken={taken}
            selected={selected}
            fare={fare[place.cabinClass]}
            onToggle={onToggle}
            className={isSuite ? styles.suite : styles.cabin}
          >
            <BedGlyph />
            <span>{place.label}</span>
          </PlaceButton>
        ))}
      </div>
      <div className={styles.corridor} aria-hidden="true" />
    </div>
  );
}

export function TrainMap({
  departureId,
  from,
  to,
  initialTaken,
  classes,
  initialClass,
}: {
  departureId: string;
  from: string;
  to: string;
  initialTaken: string[];
  classes: ClassOffer[];
  initialClass?: CabinClass;
}) {
  const router = useRouter();
  const [taken, setTaken] = useState(() => new Set(initialTaken));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rail = useRef<HTMLDivElement>(null);

  const fare = useMemo(
    () => Object.fromEntries(classes.map((c) => [c.cabinClass, c.fareCents])) as Record<CabinClass, number>,
    [classes],
  );

  const free = useMemo(() => {
    const counts: Record<CabinClass, number> = { suite: 0, sleeper: 0, couchette: 0, seat: 0 };
    for (const car of FORMATION) {
      for (const place of car.places) if (!taken.has(place.id)) counts[place.cabinClass] += 1;
    }
    return counts;
  }, [taken]);

  const scrollToClass = useCallback((cabinClass: CabinClass) => {
    const target = rail.current?.querySelector<HTMLElement>(`[data-car-kind="${cabinClass}"]`);
    if (!target || !rail.current) return;
    rail.current.scrollTo({ left: target.offsetLeft - 24, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (initialClass) scrollToClass(initialClass);
  }, [initialClass, scrollToClass]);

  // Other people are booking too. Anything they take shows up within a few seconds.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/departures/${departureId}/places`, { cache: "no-store" });
        if (!response.ok) return;
        const data: { taken: string[] } = await response.json();
        const nowTaken = new Set(data.taken);
        setTaken(nowTaken);
        setSelected((current) => {
          const lost = [...current].filter((id) => nowTaken.has(id));
          if (lost.length === 0) return current;
          setMessage(`Someone else just took ${lost.map((id) => describePlace(PLACE_BY_ID[id])).join(" and ")}.`);
          return new Set([...current].filter((id) => !nowTaken.has(id)));
        });
      } catch {
        // Next poll will catch up.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [departureId]);

  function toggle(id: string) {
    setMessage(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size >= MAX_PLACES) {
        setMessage(`${MAX_PLACES} places to a booking. Book again for the rest of the party.`);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function hold() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departureId, from, to, placeIds: [...selected] }),
      });
      const data = await response.json();
      if (response.ok) {
        router.push(`/book/checkout/${data.holdId}`);
        return;
      }
      if (response.status === 409 && data.error.conflicts) {
        const conflicts: string[] = data.error.conflicts;
        setTaken((current) => new Set([...current, ...conflicts]));
        setSelected((current) => new Set([...current].filter((id) => !conflicts.includes(id))));
        setMessage(`Someone got there first: ${conflicts.map((id) => describePlace(PLACE_BY_ID[id])).join(", ")}.`);
      } else {
        setMessage(data.error?.message ?? "That didn't work. Try again.");
      }
    } catch {
      setMessage("We couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  const chosen = [...selected].map((id) => PLACE_BY_ID[id]);
  const total = chosen.reduce((sum, place) => sum + fare[place.cabinClass], 0);

  return (
    <>
      <div className={`wrap ${styles.classes}`}>
        {classes.map(({ cabinClass }) => (
          <button
            key={cabinClass}
            type="button"
            className={styles.classChip}
            style={{ background: CabinColours[cabinClass] }}
            onClick={() => scrollToClass(cabinClass)}
          >
            <span className={styles.chipName}>{CLASSES[cabinClass].name}</span>
            <span className={`sign tabular ${styles.chipPrice}`}>{formatEuro(fare[cabinClass])}</span>
            <span className={styles.chipFree}>{free[cabinClass]} free</span>
          </button>
        ))}
      </div>

      <div className={styles.railWrap}>
        <div ref={rail} className={styles.rail} tabIndex={0} role="group" aria-label="The train, car by car. Scroll sideways.">
          <div className={styles.loco} aria-hidden="true">
            <span className={styles.locoLight} />
            <span className={styles.locoGlass} />
          </div>
          {FORMATION.map((car) => (
            <section
              key={car.number}
              className={styles.car}
              data-car-kind={car.kind}
              style={{ "--class-ink": car.kind === "dining" ? "#f6f1e5" : CabinColours[car.kind] } as React.CSSProperties}
              aria-label={`Car ${car.number}, ${car.name}`}
            >
              <header className={styles.carHeader}>
                <span className={`sign ${styles.carNumber}`}>{car.number}</span>
                <span className={styles.carName}>{car.name}</span>
              </header>
              <CarBody car={car} taken={taken} selected={selected} fare={fare} onToggle={toggle} />
            </section>
          ))}
        </div>
      </div>

      <div className={styles.legend} aria-hidden="true">
        <div className="wrap">
          <span className={styles.key} data-key="free">
            Free
          </span>
          <span className={styles.key} data-key="selected">
            Yours
          </span>
          <span className={styles.key} data-key="taken">
            Taken
          </span>
          <span className={styles.liveNote}>Live. Other passengers&rsquo; choices appear here as they make them.</span>
        </div>
      </div>

      <div className={styles.tray} aria-live="polite">
        <div className={`wrap ${styles.trayInner}`}>
          <div className={styles.trayText}>
            {message && <p className={styles.message}>{message}</p>}
            {chosen.length === 0 ? (
              <p className={styles.hint}>Pick up to {MAX_PLACES} places. They&rsquo;re yours for ten minutes while you fill in your name.</p>
            ) : (
              <ul className={styles.chosen}>
                {chosen.map((place) => (
                  <li key={place.id}>
                    <button type="button" className={styles.chosenItem} onClick={() => toggle(place.id)} aria-label={`Remove ${describePlace(place)}`}>
                      <span>{describePlace(place)}</span>
                      <span className="tabular">{formatEuro(fare[place.cabinClass])}</span>
                      <svg viewBox="0 0 12 12" aria-hidden="true">
                        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.trayAction}>
            {chosen.length > 0 && <p className={`sign tabular ${styles.total}`}>{formatEuro(total)}</p>}
            <button type="button" className={styles.holdButton} disabled={chosen.length === 0 || busy} onClick={hold}>
              <span>{busy ? "Holding" : "Hold these"}</span>
              <svg viewBox="0 0 40 16" aria-hidden="true">
                <path d="M0 8h37M30 1l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
