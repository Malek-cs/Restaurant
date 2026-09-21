import { apiRouteWith } from "@/lib/api/handler";
import { getOrder } from "@/services/order.service";

export const GET = apiRouteWith<{ id: string }>()({ permission: ["orders:view", "orders:view_assigned", "orders:manage"] }, async ({ params, user }) =>
  getOrder(params.id, user),
);
