import { apiRoute } from "@/lib/api/handler";
import { adminCreateOrderSchema, orderListQuery } from "@/lib/validation/order";
import { createOrder, listOrders } from "@/services/order.service";

export const GET = apiRoute({ permission: ["orders:view", "orders:view_assigned", "orders:manage"], query: orderListQuery }, async ({ query, user }) =>
  listOrders(query, user),
);

export const POST = apiRoute({ permission: "orders:create", body: adminCreateOrderSchema }, async ({ body, user, audit }) => {
  const order = await createOrder(body, { source: "ADMIN", actor: user });
  await audit({ action: "order.created", entity: "Order", entityId: order.id, summary: `${user.name} created order #${order.number} for ${body.customer.name}.` });
  return order;
});
