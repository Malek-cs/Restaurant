import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/database/client";
import { env } from "@/lib/env";
import { SESSION_COOKIE, SESSION_TTL_MS, signSessionToken, verifySessionToken } from "./token";
import { hasPermission, type Permission, type RoleKey } from "./permissions";
import type { AuthUser } from "@/types/auth";
import { forbidden, unauthorized } from "@/lib/api/errors";

export async function createSession(userId: string, meta: { ip?: string | null; userAgent?: string | null }) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await db.session.create({
    data: { userId, ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 300) ?? null, expiresAt },
  });
  const token = await signSessionToken({ sid: session.id, uid: userId }, expiresAt);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure cookies require https. Derive from APP_URL so plain-http LAN/staging deployments still work.
    secure: env().APP_URL.startsWith("https://"),
    path: "/",
    expires: expiresAt,
  });
  return session;
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const claims = await verifySessionToken(token);
    if (claims) await db.session.updateMany({ where: { id: claims.sid }, data: { revokedAt: new Date() } });
  }
  store.delete(SESSION_COOKIE);
}

/** Resolves the signed-in staff user (or null). Verifies JWT signature, session row and account status. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const session = await db.session.findUnique({
    where: { id: claims.sid },
    include: {
      user: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  });
  if (!session || session.userId !== claims.uid) return null;
  if (session.revokedAt || session.expiresAt < new Date()) return null;
  if (!session.user.isActive) return null;

  // Keep lastSeenAt reasonably fresh without writing on every request.
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }

  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: { key: u.role.key as RoleKey, name: u.role.name, rank: u.role.rank },
    permissions: u.role.permissions.map((rp) => rp.permission.key as Permission),
    twoFactorEnabled: u.twoFactorEnabled,
    sessionId: session.id,
  };
});

export async function requireUser(permission?: Permission | Permission[]): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  if (permission && !hasPermission(user.permissions, permission)) throw forbidden();
  return user;
}
