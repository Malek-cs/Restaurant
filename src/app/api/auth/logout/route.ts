import { apiRoute } from "@/lib/api/handler";
import { destroyCurrentSession } from "@/lib/auth/session";

export const POST = apiRoute({ public: true }, async ({ user, audit }) => {
  if (user) await audit({ action: "auth.logout", entity: "User", entityId: user.id, summary: `${user.name} signed out.` });
  await destroyCurrentSession();
  return { ok: true };
});
