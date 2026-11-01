import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, readBody, throttle } from "@/lib/api";
import { createSessionToken, passwordMatches, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

const schema = z.object({ password: z.string().min(1, "Enter the password.").max(200) });

export async function POST(request: NextRequest) {
  const limited = throttle(request, "ops-login", 10);
  if (limited) return limited;

  const { data, error } = await readBody(request, schema);
  if (error) return error;

  if (!passwordMatches(data.password)) return fail(401, "wrong-password", "That's not the password.");

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return new NextResponse(null, { status: 204 });
}
