import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { getDeparture, takenPlaces } from "@/lib/departures";

export const dynamic = "force-dynamic";

/** Polled by the berth map, so someone else's click shows up within seconds. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const departure = await getDeparture(id);
  if (!departure) return fail(404, "unknown-departure", "We don't know that train.");
  return NextResponse.json({
    taken: await takenPlaces(id),
    status: departure.status,
    delayMinutes: departure.delayMinutes,
  });
}
