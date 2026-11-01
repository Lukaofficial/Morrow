import Link from "next/link";
import { Flap } from "@/components/flap/Flap";
import { Nav } from "@/components/site/Nav";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.page}>
      <Nav tone="paper" />
      <main className={`wrap ${styles.main}`}>
        <h1 className="visually-hidden">Page not found</h1>
        <div className={styles.board}>
          <Flap text="This train" slots={10} />
          <Flap text="does not" slots={10} />
          <Flap text="stop here" slots={10} />
        </div>
        <p className={styles.text}>
          Either the page has moved, or you&rsquo;ve been given bad directions by someone who has only ever flown.
        </p>
        <Link href="/" className={styles.link}>
          Back to the concourse
        </Link>
      </main>
    </div>
  );
}
