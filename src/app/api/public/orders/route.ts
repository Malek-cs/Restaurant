import { apiRoute } from "@/lib/api/handler";
import { createOrderSchema } from "@/lib/validation/order";
import { createOrder } from "@/services/order.service";
import { unprocessable } from "@/lib/api/errors";

export const POST = apiRoute({ public: true, body: createOrderSchema, rateLimit: { key: "place-order", limit: 15, windowMs: 60 * 60_000 } }, async ({ body }) => {
  if (body.type === "DINE_IN") throw unprocessable("Dine-in orders can't be placed online.", { type: "Choose delivery or pickup" });
  return createOrder(body, { source: "WEB" });
});
