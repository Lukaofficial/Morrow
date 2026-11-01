"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "./DepartureControls.module.css";

export function DepartureControls({
  id,
  delayMinutes,
  status,
  departed,
  label,
}: {
  id: string;
  delayMinutes: number;
  status: "scheduled" | "cancelled";
  departed: boolean;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function change(body: { delayMinutes?: number; status?: "scheduled" | "cancelled" }) {
    setError(null);
    const response = await fetch(`/api/ops/departures/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setError("Not saved");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (departed) return <span className={styles.gone}>Departed</span>;

  if (status === "cancelled") {
    return (
      <span className={styles.controls}>
        <button type="button" className={styles.button} disabled={pending} onClick={() => change({ status: "scheduled" })}>
          Reinstate
        </button>
        {error && <span className={styles.error}>{error}</span>}
      </span>
    );
  }

  return (
    <span className={styles.controls} data-pending={pending || undefined}>
      <button
        type="button"
        className={styles.button}
        disabled={pending}
        aria-label={`Add 15 minutes of delay to ${label}`}
        onClick={() => change({ delayMinutes: Math.min(delayMinutes + 15, 240) })}
      >
        +15
      </button>
      {delayMinutes > 0 && (
        <button
          type="button"
          className={styles.button}
          disabled={pending}
          aria-label={`Clear the delay on ${label}`}
          onClick={() => change({ delayMinutes: 0 })}
        >
          On time
        </button>
      )}
      <button
        type="button"
        className={`${styles.button} ${styles.cancel}`}
        disabled={pending}
        aria-label={`Cancel ${label}`}
        onClick={() => change({ status: "cancelled" })}
      >
        Cancel
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </span>
  );
}
