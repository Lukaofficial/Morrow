import { CabinPlan } from "@/components/art/CabinPlans";
import { CabinClass, CLASSES } from "@/lib/formation";
import { fareCents, formatEuro } from "@/lib/pricing";
import styles from "./Cabins.module.css";

const ORDER: { cabinClass: CabinClass; colour: string }[] = [
  { cabinClass: "seat", colour: "#a9dcf2" },
  { cabinClass: "couchette", colour: "#97e3cf" },
  { cabinClass: "sleeper", colour: "#ffcf4d" },
  { cabinClass: "suite", colour: "#ff9d9a" },
];

/** The empty-train midweek fare on the line everyone knows, as a fair "from" price. */
function fromPrice(cabinClass: CabinClass) {
  return formatEuro(fareCents({ cabinClass, km: 1380, claimed: 0, weekday: 2, daysOut: 14 }));
}

export function Cabins() {
  return (
    <section id="cabins" className={styles.section} aria-labelledby="cabins-heading">
      <h2 id="cabins-heading" className="visually-hidden">
        Where you&rsquo;ll sleep
      </h2>
      <ul className={styles.grid}>
        {ORDER.map(({ cabinClass, colour }) => {
          const info = CLASSES[cabinClass];
          return (
            <li key={cabinClass} className={styles.panel} style={{ background: colour, "--panel": colour } as React.CSSProperties}>
              <div className={styles.top}>
                <h3 className={`sign ${styles.name}`}>{info.name}</h3>
                <p className={styles.price}>
                  <span className={styles.from}>Paris to Vienna, from</span>
                  <span className={`sign tabular ${styles.amount}`}>{fromPrice(cabinClass)}</span>
                </p>
              </div>
              <CabinPlan cabinClass={cabinClass} className={styles.plan} />
              <p className={styles.blurb}>{info.blurb}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
