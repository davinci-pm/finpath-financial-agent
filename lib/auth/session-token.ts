import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "finpath_session";

export type SessionPayload = {
  userId: string;
  inviteId: string;
};

function sessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET 必须至少为 32 个字符");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(sessionKey());
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId !== "string" || typeof payload.inviteId !== "string") {
      return null;
    }
    return { userId: payload.userId, inviteId: payload.inviteId };
  } catch {
    return null;
  }
}
