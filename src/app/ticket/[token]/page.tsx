import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TicketActions } from "@/components/booking/TicketActions";
import { Logo } from "@/components/brand/Logo";
import { Nav } from "@/components/site/Nav";
import { code128 } from "@/lib/barcode";
import { getTicket } from "@/lib/bookings";
import { CLASSES, describePlace, PLACE_BY_ID } from "@/lib/formation";
import { Direction, platformFor, STATIONS } from "@/lib/network";
import { BREAKFAST_CENTS, formatEuro } from "@/lib/pricing";
import { formatDay } from "@/lib/time";
import styles from "./ticket.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your ticket", robots: { index: false } };

function Barcode({ value, className }: { value: string; className?: string }) {
  const widths = code128(value);
  const total = widths.reduce((sum, w) => sum + w, 0);
  let x = 0;
  return (
    <svg className={className} viewBox={`0 0 ${total} 60`} preserveAspectRatio="none" role="img" aria-label={`Barcode for ${value}`}>
      {widths.map((width, i) => {
        const bar = i % 2 === 0 ? <rect key={i} x={x} y="0" width={width} height="60" fill="currentColor" /> : null;
        x += width;
        return bar;
      })}
    </svg>
  );
}

export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ticket = await getTicket(token);
  if (!ticket) notFound();

  const { booking, departure, places, journey } = ticket;
  const from = STATIONS[booking.fromStation];
  const to = STATIONS[booking.toStation];
  const cancelled = booking.status === "cancelled";
  const direction = departure.direction as Direction;
  const canCancel = !cancelled && journey.from.instant.getTime() > Date.now();

  const placeRows = places.map((p) => {
    const place = PLACE_BY_ID[p.placeId];
    return { id: p.placeId, label: describePlace(place), className: CLASSES[place.cabinClass].name, price: p.priceCents };
  });

  return (
    <div className={styles.page}>
      <div className={styles.sky} aria-hidden="true" />
      <Nav />
      <main className={`wrap ${styles.main}`}>
        <div className={styles.headline}>
          <h1 className={`sign ${styles.title}`}>{cancelled ? "Booking cancelled" : "You’re going to sleep well"}</h1>
          {!cancelled && (
            <p className={styles.lede}>
              Your reference is <strong>{booking.reference}</strong>. Keep this page, or come back with that and your email.
            </p>
          )}
        </div>

        <article className={styles.ticket} data-cancelled={cancelled || undefined}>
          <div className={styles.stubMain}>
            <header className={styles.ticketHead}>
              <Logo className={styles.logo} />
              <p className={styles.lineName}>{journey.line.name}</p>
            </header>

            <div className={styles.route}>
              <div>
                <p className={`sign ${styles.city}`}>{from.city}</p>
                <p className={styles.where}>{from.station}</p>
                <p className={styles.when}>
                  <span className={`sign tabular ${styles.clock}`}>{journey.from.clock}</span>
                  <span className={styles.day}>{formatDay(journey.from.date)}</span>
                </p>
              </div>
              <svg className={styles.arrow} viewBox="0 0 64 20" aria-hidden="true">
                <path d="M0 10h60M51 1l9 9-9 9" fill="none" stroke="currentColor" strokeWidth="3.4" />
              </svg>
              <div>
                <p className={`sign ${styles.city}`}>{to.city}</p>
                <p className={styles.where}>{to.station}</p>
                <p className={styles.when}>
                  <span className={`sign tabular ${styles.clock}`}>{journey.to.clock}</span>
                  <span className={styles.day}>{formatDay(journey.to.date)}</span>
                </p>
              </div>
            </div>

            <dl className={styles.details}>
              <div>
                <dt>Passenger</dt>
                <dd>
                  {booking.leadName}
                  {booking.travellers > 1 && ` and ${booking.travellers - 1} more`}
                </dd>
              </div>
              <div className={styles.wide}>
                <dt>{placeRows.length > 1 ? "Your places" : "Your place"}</dt>
                {placeRows.map((row) => (
                  <dd key={row.id}>{row.label}</dd>
                ))}
              </div>
              <div>
                <dt>Platform</dt>
                <dd>{platformFor(journey.line.id, direction)}, usually</dd>
              </div>
              <div>
                <dt>Wake-up knock</dt>
                <dd>{booking.wakeCall > 0 ? `${booking.wakeCall} minutes before arrival` : "None. Sleep well."}</dd>
              </div>
              <div>
                <dt>Breakfast</dt>
                <dd>
                  {booking.breakfast
                    ? `For ${booking.travellers}, at your door (${formatEuro(BREAKFAST_CENTS * booking.travellers)})`
                    : "Not booked"}
                </dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd className="tabular">{formatEuro(booking.totalCents)}</dd>
              </div>
            </dl>
          </div>

          <div className={styles.stub}>
            <p className={styles.stubRef}>{booking.reference}</p>
            <Barcode value={booking.reference} className={styles.barcode} />
            <p className={styles.stubNote}>Show this to the conductor. Or don&rsquo;t: there isn&rsquo;t one.</p>
          </div>

          {cancelled && (
            <p className={`sign ${styles.stamp}`} aria-hidden="true">
              Cancelled
            </p>
          )}
        </article>

        <TicketActions token={token} canCancel={canCancel} />
      </main>
    </div>
  );
}
