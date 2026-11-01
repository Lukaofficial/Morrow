"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./LookupForm.module.css";

export function LookupForm() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email }),
      });
      const data = await response.json();
      if (response.ok) {
        router.push(`/ticket/${data.accessToken}`);
        return;
      }
      setError(data.error.message);
    } catch {
      setError("We couldn't reach the server. Try again in a moment.");
    }
    setBusy(false);
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label className={styles.field}>
        <span className={styles.label}>Booking reference</span>
        <input
          className={styles.input}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="MRW-"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Email you booked with</span>
        <input
          className={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={styles.submit} disabled={busy}>
        <span>{busy ? "Looking" : "Find it"}</span>
        <svg viewBox="0 0 40 16" aria-hidden="true">
          <path d="M0 8h37M30 1l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.6" />
        </svg>
      </button>
    </form>
  );
}
