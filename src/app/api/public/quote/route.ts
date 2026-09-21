import { apiRoute } from "@/lib/api/handler";
import { quoteSchema } from "@/lib/validation/order";
import { buildQuote } from "@/services/order.service";

export const POST = apiRoute({ public: true, body: quoteSchema, rateLimit: { key: "quote", limit: 120, windowMs: 60_000 } }, async ({ body }) =>
  buildQuote(body, { channel: "WEB" }),
);
