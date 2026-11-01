import type { Metadata } from "next";
import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { Nav } from "@/components/site/Nav";
import { describePlace, PLACE_BY_ID } from "@/lib/formation";
import { getHold } from "@/lib/holds";
import { STATIONS } from "@/lib/network";
import { formatDay } from "@/lib/time";
import Link from "next/link";
import styles from "./checkout.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your details" };

export default async function CheckoutPage({ params }: { params: Promise<{ holdId: string }> }) {
  const { holdId } = await params;
  const held = await getHold(holdId);

  if (!held) {
    return (
      <div className={styles.page}>
        <Nav />
        <main className={`wrap ${styles.gone}`}>
          <h1 className={`sign ${styles.goneTitle}`}>That hold ran out</h1>
          <p className={styles.goneText}>
            Places are only yours for ten minutes, and then they go back on sale. Nothing has been booked.
          </p>
          <Link href="/" className={styles.goneLink}>
            Start again
          </Link>
        </main>
      </div>
    );
  }

  const { hold, places, journey } = held;
  const from = STATIONS[hold.fromStation];
  const to = STATIONS[hold.toStation];

  const items = places.map((p) => {
    const place = PLACE_BY_ID[p.placeId];
    return { id: p.placeId, label: describePlace(place), cabinClass: place.cabinClass, priceCents: p.priceCents };
  });

  const maxTravellers = items.reduce(
    (sum, item) => sum + (item.cabinClass === "suite" || item.cabinClass === "sleeper" ? 2 : 1),
    0,
  );

  return (
    <div className={styles.page}>
      <Nav />
      <main className={`wrap ${styles.heading}`}>
        <h1 className={`sign ${styles.title}`}>Nearly in bed</h1>
        <CheckoutForm
          holdId={holdId}
          expiresAt={hold.expiresAt.toISOString()}
          items={items}
          minTravellers={items.length}
          maxTravellers={maxTravellers}
          summary={{
            line: journey.line.name,
            from: from.city,
            fromStation: from.station,
            fromClock: journey.from.clock,
            fromDay: formatDay(journey.from.date),
            to: to.city,
            toStation: to.station,
            toClock: journey.to.clock,
            toDay: formatDay(journey.to.date),
          }}
        />
      </main>
    </div>
  );
}
