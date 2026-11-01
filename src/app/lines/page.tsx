import type { Metadata } from "next";
import { PosterWall } from "@/components/home/PosterWall";
import { Footer } from "@/components/site/Footer";
import { Nav } from "@/components/site/Nav";
import styles from "./lines.module.css";

export const metadata: Metadata = {
  title: "The lines",
  description: "Six sleeper lines across Europe, from Lisbon to the Bosphorus.",
};

export default function LinesPage() {
  return (
    <>
      <div className={styles.top}>
        <Nav />
      </div>
      <main>
        <PosterWall />
      </main>
      <Footer />
    </>
  );
}
