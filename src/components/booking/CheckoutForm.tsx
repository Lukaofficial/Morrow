"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Flap } from "@/components/flap/Flap";
import { BREAKFAST_CENTS, formatEuro } from "@/lib/pricing";
import styles from "./CheckoutForm.module.css";

type Item = { id: string; label: string; cabinClass: string; priceCents: number };

type Summary = {
  line: string;
  from: string;
  fromStation: string;
  fromClock: string;
  fromDay: string;
  to: string;
  toStation: string;
  toClock: string;
  toDay: string;
};

const WAKE_OPTIONS = [
  { value: 0, label: "Let me sleep" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
];

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function CheckoutForm({
  holdId,
  expiresAt,
  items,
  minTravellers,
  maxTravellers,
  summary,
}: {
  holdId: string;
  expiresAt: string;
  items: Item[];
  minTravellers: number;
  maxTravellers: number;
  summary: Summary;
}) {
  const router = useRouter();
  const deadline = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [leadName, setLeadName] = useState("");
  const [email, setEmail] = useState("");
  const [travellers, setTravellers] = useState(minTravellers);
  const [breakfast, setBreakfast] = useState(true);
  const [wakeCall, setWakeCall] = useState(30);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const tick = () => setRemaining(deadline - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const expired = remaining !== null && remaining <= 0;
  const fares = items.reduce((sum, item) => sum + item.priceCents, 0);
  const total = fares + (breakfast ? BREAKFAST_CENTS * travellers : 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdId, leadName, email, travellers, breakfast, wakeCall }),
      });
      const data = await response.json();
      if (response.ok) {
        router.push(`/ticket/${data.accessToken}`);
        return;
      }
      if (response.status === 410) {
        router.refresh();
      }
      setError({ message: data.error.message, field: data.error.field });
    } catch {
      setError({ message: "We couldn't reach the server. Your places are still held, so try again." });
    }
    setBusy(false);
  }

  async function release() {
    await fetch(`/api/holds/${holdId}`, { method: "DELETE" });
    router.back();
  }

  const travellerOptions = Array.from({ length: maxTravellers - minTravellers + 1 }, (_, i) => minTravellers + i);

  return (
    <div className={styles.layout}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <label className={styles.field} data-invalid={error?.field === "leadName" || undefined}>
          <span className={styles.label}>Name on the door</span>
          <input
            className={styles.input}
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>

        <label className={styles.field} data-invalid={error?.field === "email" || undefined}>
          <span className={styles.label}>Email</span>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <span className={styles.help}>With your reference, this finds your booking again later.</span>
        </label>

        {travellerOptions.length > 1 && (
          <fieldset className={styles.field}>
            <legend className={styles.label}>How many of you?</legend>
            <div className={styles.segments}>
              {travellerOptions.map((n) => (
                <label key={n} className={styles.segment} data-selected={n === travellers || undefined}>
                  <input type="radio" name="travellers" checked={n === travellers} onChange={() => setTravellers(n)} />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className={styles.field}>
          <legend className={styles.label}>Knock on the door before arrival</legend>
          <div className={styles.segments}>
            {WAKE_OPTIONS.map((option) => (
              <label key={option.value} className={styles.segment} data-selected={option.value === wakeCall || undefined}>
                <input type="radio" name="wake" checked={option.value === wakeCall} onChange={() => setWakeCall(option.value)} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className={styles.check}>
          <input type="checkbox" checked={breakfast} onChange={(e) => setBreakfast(e.target.checked)} />
          <span className={styles.box} aria-hidden="true" />
          <span>
            <strong>Breakfast at your door, {formatEuro(BREAKFAST_CENTS)} each.</strong> Coffee, bread from the last stop,
            something with fruit in it.
          </span>
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error.message}
          </p>
        )}

        <div className={styles.actions}>
          <button type="submit" className={styles.confirm} disabled={busy || expired}>
            <span>{busy ? "Booking" : `Confirm, ${formatEuro(total)}`}</span>
            <svg viewBox="0 0 40 16" aria-hidden="true">
              <path d="M0 8h37M30 1l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.6" />
            </svg>
          </button>
          <button type="button" className={styles.release} onClick={release}>
            Let these places go
          </button>
        </div>
        <p className={styles.notice}>
          No card needed. Morrow isn&rsquo;t a real company, so no money changes hands and no train will come.
        </p>
      </form>

      <aside className={styles.ticket} aria-label="Your journey">
        <div className={styles.countdown}>
          <p className={styles.countdownLabel}>{expired ? "Hold expired" : "Yours for"}</p>
          <Flap text={remaining === null ? "10:00" : formatRemaining(remaining)} slots={5} stagger={0} maxSteps={3} />
        </div>
        <p className={styles.ticketLine}>{summary.line}</p>
        <div className={styles.leg}>
          <p className={`sign tabular ${styles.legClock}`}>{summary.fromClock}</p>
          <div>
            <p className={styles.legCity}>{summary.from}</p>
            <p className={styles.legDetail}>
              {summary.fromStation}, {summary.fromDay}
            </p>
          </div>
        </div>
        <div className={styles.leg}>
          <p className={`sign tabular ${styles.legClock}`}>{summary.toClock}</p>
          <div>
            <p className={styles.legCity}>{summary.to}</p>
            <p className={styles.legDetail}>
              {summary.toStation}, {summary.toDay}
            </p>
          </div>
        </div>
        <ul className={styles.items}>
          {items.map((item) => (
            <li key={item.id}>
              <span>{item.label}</span>
              <span className="tabular">{formatEuro(item.priceCents)}</span>
            </li>
          ))}
          {breakfast && (
            <li>
              <span>
                Breakfast for {travellers}
              </span>
              <span className="tabular">{formatEuro(BREAKFAST_CENTS * travellers)}</span>
            </li>
          )}
        </ul>
        <p className={styles.totalRow}>
          <span>Total</span>
          <span className={`sign tabular ${styles.totalAmount}`}>{formatEuro(total)}</span>
        </p>
      </aside>
    </div>
  );
}
