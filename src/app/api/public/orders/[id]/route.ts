import { apiRouteWith } from "@/lib/api/handler";
import { getPublicOrder } from "@/services/order.service";
import { notFound } from "@/lib/api/errors";

export const GET = apiRouteWith<{ id: string }>()({ public: true, rateLimit: { key: "track", limit: 120, windowMs: 60_000 } }, async ({ params }) => {
  const order = await getPublicOrder(params.id);
  if (!order) throw notFound("Order");
  return order;
});
