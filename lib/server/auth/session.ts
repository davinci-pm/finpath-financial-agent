import "server-only";

import { cookies } from "next/headers";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session-token";

const DEFAULT_SESSION_DAYS = 30;

function sessionDays(): number {
  const value = Number(process.env.SESSION_DAYS ?? DEFAULT_SESSION_DAYS);
  return Number.isInteger(value) && value >= 1 && value <= 310
    ? value
    : DEFAULT_SESSION_DAYS;
}

export async function createSession(
  userId: string,
  inviteId: string,
  inviteExpiresAt: string,
): Promise<void> {
  const configuredMaxAge = sessionDays() * 24 * 60 * 60;
  const inviteRemainingSeconds = Math.floor(
    (Date.parse(inviteExpiresAt) - Date.now()) / 1000,
  );
  const maxAge = Math.min(configuredMaxAge, inviteRemainingSeconds);
  if (maxAge <= 0) throw new Error("邀请码已过期");
  const expiresAt = new Date(Date.now() + maxAge * 1000);
  const token = await createSessionToken({ userId, inviteId }, expiresAt);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
    priority: "high",
  });
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
