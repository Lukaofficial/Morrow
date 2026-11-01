import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="wrap">
        <div className={styles.columns}>
          <nav aria-label="Footer">
            <h2 className={styles.heading}>Travel</h2>
            <ul>
              <li>
                <Link href="/lines">The lines</Link>
              </li>
              <li>
                <Link href="/#cabins">Cabins</Link>
              </li>
              <li>
                <Link href="/manage">Find my booking</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Behind the scenes">
            <h2 className={styles.heading}>Behind the scenes</h2>
            <ul>
              <li>
                <Link href="/ops">Operations room</Link>
              </li>
            </ul>
          </nav>
          <p className={styles.notice}>
            <strong>Morrow doesn&rsquo;t exist.</strong> The company, the trains and the timetable are
            invented, and nothing here will get you to Vienna. The booking system is real, though: no
            payment is ever taken, and the other passengers are simulated. Designed and built by Luka
            Lomadze.
          </p>
        </div>
        <Logo className={styles.logo} />
      </div>
    </footer>
  );
}
