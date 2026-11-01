import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import styles from "./Nav.module.css";

export function Nav({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  return (
    <header className={styles.nav} data-tone={tone}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="Morrow, home">
          <Logo />
        </Link>
        <nav className={styles.links} aria-label="Main">
          <Link href="/lines">The lines</Link>
          <Link href="/#cabins">Cabins</Link>
          <Link href="/manage">My booking</Link>
        </nav>
      </div>
    </header>
  );
}
