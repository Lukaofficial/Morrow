import { createHash, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "morrow_ops";
const SESSION_HOURS = 8;

/** The public demo password. It's printed on the login page while it's in use. */
export const DEMO_PASSWORD = "signal-box";

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to at least 32 characters in production.");
    }
    return new TextEncoder().encode("development-only-secret-do-not-deploy-this");
  }
  return new TextEncoder().encode(value);
}

export function opsPassword(): string {
  return process.env.OPS_PASSWORD ?? DEMO_PASSWORD;
}

export function isDemoPassword(): boolean {
  return opsPassword() === DEMO_PASSWORD;
}

export function passwordMatches(attempt: string): boolean {
  // Hashing both sides gives equal-length buffers, so the comparison leaks nothing about length.
  const a = createHash("sha256").update(attempt).digest();
  const b = createHash("sha256").update(opsPassword()).digest();
  return timingSafeEqual(a, b);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "ops" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_HOURS * 3600,
};

export async function isOpsSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.role === "ops";
  } catch {
    return false;
  }
}
