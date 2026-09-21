import { apiRouteWith } from "@/lib/api/handler";
import { orderStatusSchema } from "@/lib/validation/order";
import { transitionOrder } from "@/services/order.service";

export const POST = apiRouteWith<{ id: string }>()(
  { permission: ["orders:confirm", "orders:kitchen", "orders:deliver", "orders:manage"], body: orderStatusSchema },
  async ({ params, body, user, audit }) => {
    const { from, number } = await transitionOrder(params.id, body.status, user, body.note);
    await audit({
      action: "order.status_changed",
      entity: "Order",
      entityId: params.id,
      summary: `${user.name} changed order #${number} from ${from} to ${body.status}.`,
      metadata: { from, to: body.status, note: body.note ?? null },
    });
    return { ok: true, status: body.status };
  },
);
