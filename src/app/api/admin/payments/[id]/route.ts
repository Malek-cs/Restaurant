import { apiRouteWith } from "@/lib/api/handler";
import { paymentUpdateSchema } from "@/lib/validation/admin";
import { updatePaymentStatus } from "@/services/payment.service";

export const PATCH = apiRouteWith<{ id: string }>()({ permission: "payments:update", body: paymentUpdateSchema }, async ({ params, body, user, audit }) => {
  const { payment, from, orderNumber } = await updatePaymentStatus(params.id, body.status);
  await audit({
    action: "payment.status_changed",
    entity: "Payment",
    entityId: payment.id,
    summary: `${user.name} changed the payment for order #${orderNumber} from ${from} to ${body.status}.`,
  });
  return payment;
});
