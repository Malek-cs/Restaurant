import { apiRouteWith } from "@/lib/api/handler";
import { markLogSent } from "@/services/whatsapp.service";

export const POST = apiRouteWith<{ id: string }>()({ permission: ["whatsapp:manage", "orders:view", "orders:manage"] }, async ({ params }) => {
  await markLogSent(params.id);
  return { ok: true };
});
