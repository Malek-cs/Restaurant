import { apiRouteWith } from "@/lib/api/handler";
import { revokeSession } from "@/services/auth.service";

export const DELETE = apiRouteWith<{ id: string }>()({ authenticated: true }, async ({ params, user }) => {
  await revokeSession(user.id, params.id);
  return { ok: true };
});
