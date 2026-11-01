import { NextRequest, NextResponse } from "next/server";
import { fail, throttle } from "@/lib/api";
import { cancelBooking } from "@/lib/bookings";

const MESSAGES = {
  "not-found": [404, "We can't find that ticket."],
  departed: [409, "That train has already left."],
  "already-cancelled": [409, "This booking is already cancelled."],
} as const;

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limited = throttle(request, "cancel", 12);
  if (limited) return limited;
  const { token } = await params;
  const result = await cancelBooking({ accessToken: token }, "public");
  if (result.ok) return NextResponse.json({ cancelled: true });
  const [status, message] = MESSAGES[result.reason];
  return fail(status, result.reason, message);
}
