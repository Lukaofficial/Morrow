import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { allow } from "./rate-limit";

export function fail(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
}

/** Returns a response if the caller has used up their allowance, otherwise null. */
export function throttle(request: NextRequest, bucket: string, limit: number) {
  if (allow(`${bucket}:${clientIp(request)}`, limit)) return null;
  return fail(429, "rate-limited", "Too many requests. Give it a minute.");
}

/** Parses and validates a JSON body. A failure comes back ready to return. */
export async function readBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: fail(400, "invalid-json", "That wasn't valid JSON.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: fail(422, "invalid-input", issue.message, { field: issue.path.join(".") }),
    };
  }
  return { data: parsed.data };
}
