import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, readBody, throttle } from "@/lib/api";
import { createHold, MAX_PLACES } from "@/lib/holds";

const schema = z.object({
  departureId: z.string().min(1).max(64),
  from: z.string().min(1).max(32),
  to: z.string().min(1).max(32),
  placeIds: z.array(z.string().max(8)).min(1, "Pick at least one place.").max(MAX_PLACES, `${MAX_PLACES} places at most.`),
});

const MESSAGES = {
  "unknown-departure": [404, "We don't know that train."],
  "invalid-places": [422, "Those places don't exist on this train."],
  "invalid-journey": [422, "This train doesn't make that journey."],
  departed: [409, "That train has already left."],
  cancelled: [409, "That train has been cancelled."],
} as const;

export async function POST(request: NextRequest) {
  const limited = throttle(request, "holds", 30);
  if (limited) return limited;

  const { data, error } = await readBody(request, schema);
  if (error) return error;

  const result = await createHold(data);
  if (result.ok) {
    return NextResponse.json({ holdId: result.holdId, expiresAt: result.expiresAt }, { status: 201 });
  }
  if (result.reason === "conflict") {
    return fail(409, "conflict", "Someone got there first.", { conflicts: result.conflicts });
  }
  const [status, message] = MESSAGES[result.reason];
  return fail(status, result.reason, message);
}
