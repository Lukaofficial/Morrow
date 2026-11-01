"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./LoginForm.module.css";

export function LoginForm({ demoPassword }: { demoPassword?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/ops/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.replace("/ops");
        router.refresh();
        return;
      }
      const data = await response.json();
      setError(data.error.message);
    } catch {
      setError("We couldn't reach the server.");
    }
    setBusy(false);
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        <span className={styles.label}>Password</span>
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      {demoPassword && (
        <p className={styles.demo}>
          This is a demo, so here it is: <button type="button" className={styles.fill} onClick={() => setPassword(demoPassword)}>{demoPassword}</button>
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={styles.submit} disabled={busy}>
        {busy ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
