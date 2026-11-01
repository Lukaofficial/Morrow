import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, readBody, throttle } from "@/lib/api";
import { confirmBooking } from "@/lib/bookings";

const schema = z.object({
  holdId: z.string().min(1).max(32),
  leadName: z.string().trim().min(2, "We'll need a name for the door.").max(80),
  email: z.email("That email doesn't look right.").max(160),
  travellers: z.number().int().min(1).max(8),
  breakfast: z.boolean(),
  wakeCall: z.union([z.literal(0), z.literal(15), z.literal(30), z.literal(60)]),
});

export async function POST(request: NextRequest) {
  const limited = throttle(request, "bookings", 12);
  if (limited) return limited;

  const { data, error } = await readBody(request, schema);
  if (error) return error;

  const { holdId, ...details } = data;
  const result = await confirmBooking(holdId, details);
  if (result.ok) {
    return NextResponse.json({ reference: result.reference, accessToken: result.accessToken }, { status: 201 });
  }
  if (result.reason === "expired") {
    return fail(410, "expired", "Your hold ran out and the places went back on sale.");
  }
  return fail(422, result.reason, "That's more people than these places can sleep.");
}
