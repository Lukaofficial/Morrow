import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CancelBooking } from "@/components/ops/CancelBooking";
import { isOpsSession } from "@/lib/auth";
import { describePlace, PLACE_BY_ID } from "@/lib/formation";
import { STATIONS } from "@/lib/network";
import { manifest, opsDeparture } from "@/lib/ops";
import { formatEuro } from "@/lib/pricing";
import { formatDay } from "@/lib/time";
import styles from "../../ops.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manifest", robots: { index: false } };

export default async function ManifestPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isOpsSession())) redirect("/ops/login");

  const { id } = await params;
  const train = await opsDeparture(id);
  if (!train) notFound();

  const rows = await manifest(id);

  return (
    <div className={styles.page}>
      <main className="wrap">
        <Link href={`/ops?date=${train.serviceDate}`} className={styles.back}>
          Back to the operations room
        </Link>
        <h1 className={`sign ${styles.manifestTitle}`}>
          {train.from} to {train.to}
        </h1>
        <p className={styles.manifestSub}>
          {train.lineName}, {formatDay(train.serviceDate)}, leaving at <span className="tabular">{train.time}</span>.{" "}
          {rows.length} bookings, {Math.round(train.loadFactor * 100)}% full.
        </p>

        <section className={styles.panel} aria-label="Passenger manifest">
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Passenger</th>
                  <th scope="col">Places</th>
                  <th scope="col">Journey</th>
                  <th scope="col">Paid</th>
                  <th scope="col" className={styles.right}>
                    Control
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ booking, places }) => (
                  <tr key={booking.id}>
                    <td className="tabular">{booking.reference}</td>
                    <td>
                      {booking.leadName}
                      {booking.travellers > 1 && ` +${booking.travellers - 1}`}
                      {!booking.synthetic && <span className={styles.tagReal}>real</span>}
                    </td>
                    <td>{places.map((p) => describePlace(PLACE_BY_ID[p])).join("; ")}</td>
                    <td className={styles.route}>
                      {STATIONS[booking.fromStation].city} to {STATIONS[booking.toStation].city}
                    </td>
                    <td className="tabular">{formatEuro(booking.totalCents)}</td>
                    <td className={styles.right}>
                      {train.departed ? null : <CancelBooking id={booking.id} reference={booking.reference} />}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6}>Nobody has booked this train yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
