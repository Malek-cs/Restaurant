// Edge-safe (used by proxy.ts as well as server code)
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "lumiere_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionClaims {
  sid: string;
  uid: string;
}

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set (min 32 chars)");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(claims: SessionClaims, expiresAt: Date) {
  return new SignJWT({ sid: claims.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.uid)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(key());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.sid !== "string" || typeof payload.sub !== "string") return null;
    return { sid: payload.sid, uid: payload.sub };
  } catch {
    return null;
  }
}
