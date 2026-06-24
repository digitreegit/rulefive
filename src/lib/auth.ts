import { cookies } from "next/headers";
import crypto from "crypto";
import { APP_PASSWORD, AUTH_SECRET } from "./config";

const COOKIE_NAME = "rf_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Deterministic token derived from the secret. Stored as an httpOnly cookie.
function sessionToken(): string {
  return crypto
    .createHmac("sha256", AUTH_SECRET || "dev-secret")
    .update("rulefive-session-v1")
    .digest("hex");
}

export function checkPassword(password: string): boolean {
  if (!APP_PASSWORD) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(APP_PASSWORD);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function setSessionCookie(): void {
  cookies().set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export function isAuthed(): boolean {
  const c = cookies().get(COOKIE_NAME)?.value;
  if (!c) return false;
  const expected = sessionToken();
  const a = Buffer.from(c);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
