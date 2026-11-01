import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, readBody, throttle } from "@/lib/api";
import { isOpsSession } from "@/lib/auth";
import { setDepartureState } from "@/lib/ops";

const schema = z
  .object({
    delayMinutes: z.number().int().min(0).max(240).optional(),
    status: z.enum(["scheduled", "cancelled"]).optional(),
  })
  .refine((change) => change.delayMinutes !== undefined || change.status !== undefined, {
    message: "Nothing to change.",
  });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOpsSession())) return fail(401, "unauthorised", "Sign in first.");
  const limited = throttle(request, "ops", 60);
  if (limited) return limited;

  const { data, error } = await readBody(request, schema);
  if (error) return error;

  const { id } = await params;
  const updated = await setDepartureState(id, data);
  if (!updated) return fail(404, "unknown-departure", "We don't know that train.");
  return NextResponse.json({ ok: true });
}
