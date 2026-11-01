import { NextRequest, NextResponse } from "next/server";
import { fail, throttle } from "@/lib/api";
import { isOpsSession } from "@/lib/auth";
import { cancelBooking } from "@/lib/bookings";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOpsSession())) return fail(401, "unauthorised", "Sign in first.");
  const limited = throttle(request, "ops", 60);
  if (limited) return limited;
  const { id } = await params;
  const result = await cancelBooking({ id }, "ops");
  if (!result.ok) return fail(409, result.reason, "That booking can't be cancelled.");
  return NextResponse.json({ cancelled: true });
}
