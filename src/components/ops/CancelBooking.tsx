"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "./DepartureControls.module.css";

export function CancelBooking({ id, reference }: { id: string; reference: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setError(null);
    const response = await fetch(`/api/ops/bookings/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Not cancelled");
      setArmed(false);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <span className={styles.controls} data-pending={pending || undefined}>
      {armed ? (
        <>
          <button type="button" className={`${styles.button} ${styles.cancel}`} disabled={pending} onClick={cancel}>
            Confirm
          </button>
          <button type="button" className={styles.button} onClick={() => setArmed(false)}>
            Keep
          </button>
        </>
      ) : (
        <button type="button" className={styles.button} aria-label={`Cancel booking ${reference}`} onClick={() => setArmed(true)}>
          Cancel
        </button>
      )}
      {error && <span className={styles.error}>{error}</span>}
    </span>
  );
}
