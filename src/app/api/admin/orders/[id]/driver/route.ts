import { apiRouteWith } from "@/lib/api/handler";
import { assignDriverSchema } from "@/lib/validation/order";
import { assignDriver } from "@/services/order.service";

export const PUT = apiRouteWith<{ id: string }>()({ permission: "orders:manage", body: assignDriverSchema }, async ({ params, body, user, audit }) => {
  const { number, driverName } = await assignDriver(params.id, body.driverId, user);
  await audit({
    action: "order.driver_assigned",
    entity: "Order",
    entityId: params.id,
    summary: driverName ? `${user.name} assigned order #${number} to ${driverName}.` : `${user.name} removed the driver from order #${number}.`,
  });
  return { ok: true };
});
