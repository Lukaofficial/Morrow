import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { getTicket } from "@/lib/bookings";
import { calendarEvent } from "@/lib/ics";
import { describePlace, PLACE_BY_ID } from "@/lib/formation";
import { STATIONS } from "@/lib/network";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ticket = await getTicket(token);
  if (!ticket) return fail(404, "not-found", "We can't find that ticket.");

  const { booking, journey, places } = ticket;
  const from = STATIONS[booking.fromStation];
  const to = STATIONS[booking.toStation];
  const body = calendarEvent({
    uid: `${booking.reference}@morrow.example`,
    start: journey.from.instant,
    end: journey.to.instant,
    summary: `${journey.line.name}: ${from.city} to ${to.city}`,
    location: `${from.station}, ${from.city}`,
    description: [`Booking ${booking.reference}`, ...places.map((p) => describePlace(PLACE_BY_ID[p.placeId]))].join("\n"),
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="morrow-${booking.reference}.ics"`,
    },
  });
}
