import "server-only";
import { db } from "@/database/client";
import { ApiError, unprocessable } from "@/lib/api/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const GENERIC = "Incorrect email or password.";

export async function login(input: { email: string; password: string }, meta: { ip: string; userAgent: string | null }) {
  const user = await db.user.findUnique({ where: { email: input.email }, include: { role: true } });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new ApiError(423, "LOCKED", `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
  }

  const ok = await verifyPassword(input.password, user?.passwordHash);
  if (!user || !ok) {
    if (user) {
      const failed = user.failedLoginCount + 1;
      await db.user.update({
        where: { id: user.id },
        data: { failedLoginCount: failed, ...(failed >= MAX_FAILED ? { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000), failedLoginCount: 0 } : {}) },
      });
    }
    throw new ApiError(401, "INVALID_CREDENTIALS", GENERIC);
  }
  if (!user.isActive) throw new ApiError(403, "DISABLED", "This account has been deactivated. Contact your administrator.");

  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user.id, meta);
  return { id: user.id, name: user.name, email: user.email, roleKey: user.role.key };
}

export async function listSessions(userId: string, currentSessionId: string) {
  const rows = await db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
  });
  return rows.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ip: s.ip,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
    current: s.id === currentSessionId,
  }));
}

export async function revokeSession(userId: string, sessionId: string) {
  await db.session.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeOtherSessions(userId: string, currentSessionId: string) {
  const r = await db.session.updateMany({
    where: { userId, id: { not: currentSessionId }, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return r.count;
}

export async function changePassword(userId: string, currentSessionId: string, current: string, next: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(current, user.passwordHash))) {
    throw unprocessable("Your current password is incorrect.", { currentPassword: "Incorrect password" });
  }
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  await revokeOtherSessions(userId, currentSessionId);
}
