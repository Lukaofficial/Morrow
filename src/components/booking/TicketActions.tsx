"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./TicketActions.module.css";

export function TicketActions({ token, canCancel }: { token: string; canCancel: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/tickets/${token}/cancel`, { method: "POST" });
    if (response.ok) {
      router.refresh();
    } else {
      const data = await response.json().catch(() => null);
      setError(data?.error?.message ?? "That didn't work. Try again.");
    }
    setBusy(false);
    setConfirming(false);
  }

  return (
    <div className={styles.actions}>
      <button type="button" className={styles.action} onClick={() => window.print()}>
        Print
      </button>
      <a className={styles.action} href={`/api/tickets/${token}/calendar`}>
        Add to calendar
      </a>
      {canCancel &&
        (confirming ? (
          <span className={styles.confirm}>
            <span>Give these places back?</span>
            <button type="button" className={`${styles.action} ${styles.danger}`} onClick={cancel} disabled={busy}>
              {busy ? "Cancelling" : "Yes, cancel"}
            </button>
            <button type="button" className={styles.action} onClick={() => setConfirming(false)}>
              Keep them
            </button>
          </span>
        ) : (
          <button type="button" className={styles.quiet} onClick={() => setConfirming(true)}>
            Cancel booking
          </button>
        ))}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
