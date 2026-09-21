import { apiRouteWith } from "@/lib/api/handler";
import { markRead } from "@/services/notification.service";

export const POST = apiRouteWith<{ id: string }>()({ permission: "notifications:view" }, async ({ params }) => {
  await markRead(params.id);
  return { ok: true };
});
