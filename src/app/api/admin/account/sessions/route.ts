import { apiRoute } from "@/lib/api/handler";
import { listSessions, revokeOtherSessions } from "@/services/auth.service";

export const GET = apiRoute({ authenticated: true }, async ({ user }) => listSessions(user.id, user.sessionId));

/** Sign out everywhere else. */
export const DELETE = apiRoute({ authenticated: true }, async ({ user, audit }) => {
  const count = await revokeOtherSessions(user.id, user.sessionId);
  await audit({ action: "auth.sessions_revoked", entity: "User", entityId: user.id, summary: `${user.name} signed out ${count} other session${count === 1 ? "" : "s"}.` });
  return { count };
});
