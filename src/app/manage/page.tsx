import type { Metadata } from "next";
import { LookupForm } from "@/components/booking/LookupForm";
import { Footer } from "@/components/site/Footer";
import { Nav } from "@/components/site/Nav";
import styles from "./manage.module.css";

export const metadata: Metadata = { title: "Find my booking" };

export default function ManagePage() {
  return (
    <>
      <div className={styles.page}>
        <Nav />
        <main className={`wrap ${styles.main}`}>
          <h1 className={`sign ${styles.title}`}>Where did I put that ticket</h1>
          <LookupForm />
        </main>
      </div>
      <Footer />
    </>
  );
}
