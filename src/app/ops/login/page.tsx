import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/ops/LoginForm";
import { Nav } from "@/components/site/Nav";
import { DEMO_PASSWORD, isDemoPassword, isOpsSession } from "@/lib/auth";
import styles from "../ops.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Operations room", robots: { index: false } };

export default async function OpsLoginPage() {
  if (await isOpsSession()) redirect("/ops");
  return (
    <div className={styles.page}>
      <Nav tone="paper" />
      <main className={`wrap ${styles.login}`}>
        <h1 className={`sign ${styles.loginTitle}`}>Signal box</h1>
        <p className={styles.loginText}>
          Staff only. From here you can delay a train, cancel one, and watch the public departure board change a moment later.
        </p>
        <LoginForm demoPassword={isDemoPassword() ? DEMO_PASSWORD : undefined} />
        <svg className={styles.semaphore} viewBox="0 0 320 760" aria-hidden="true">
          <rect x="146" y="60" width="28" height="700" fill="#f6f1e5" />
          <circle cx="160" cy="48" r="26" fill="#f6f1e5" />
          <g transform="rotate(-38 160 150)">
            <path d="M160 118H320V182H160Z" fill="#ff4f23" />
            <rect x="262" y="118" width="26" height="64" fill="#f6f1e5" />
            <circle cx="168" cy="150" r="20" fill="#0f1130" />
            <circle cx="168" cy="150" r="11" fill="#ffcf4d" />
          </g>
          <g transform="rotate(38 160 330)">
            <path d="M160 298H320L296 330L320 362H160Z" fill="#ffcf4d" />
            <path d="M262 298h26l-22 32 22 32h-26l-22-32Z" fill="#0f1130" />
            <circle cx="168" cy="330" r="20" fill="#0f1130" />
            <circle cx="168" cy="330" r="11" fill="#97e3cf" />
          </g>
          <rect x="120" y="700" width="80" height="60" fill="#f6f1e5" />
        </svg>
      </main>
    </div>
  );
}
