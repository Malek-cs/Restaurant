import { apiRoute } from "@/lib/api/handler";
import { changePasswordSchema } from "@/lib/validation/admin";
import { changePassword } from "@/services/auth.service";

export const POST = apiRoute({ authenticated: true, body: changePasswordSchema, rateLimit: { key: "pwd", limit: 10, windowMs: 15 * 60_000 } }, async ({ body, user, audit }) => {
  await changePassword(user.id, user.sessionId, body.currentPassword, body.newPassword);
  await audit({ action: "auth.password_changed", entity: "User", entityId: user.id, summary: `${user.name} changed their password.` });
  return { ok: true };
});
