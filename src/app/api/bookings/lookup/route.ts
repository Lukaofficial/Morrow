import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, readBody, throttle } from "@/lib/api";
import { findBookingToken } from "@/lib/bookings";

const schema = z.object({
  reference: z.string().trim().min(4, "Your reference starts with MRW-.").max(16),
  email: z.string().trim().min(3, "We'll need the email you booked with.").max(160),
});

export async function POST(request: NextRequest) {
  // Tighter than the other routes: this is the one worth brute-forcing.
  const limited = throttle(request, "lookup", 8);
  if (limited) return limited;

  const { data, error } = await readBody(request, schema);
  if (error) return error;

  const accessToken = await findBookingToken(data.reference, data.email);
  if (!accessToken) return fail(404, "not-found", "No booking matches that reference and email.");
  return NextResponse.json({ accessToken });
}
