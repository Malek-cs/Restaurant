import { apiRoute } from "@/lib/api/handler";
import { quoteSchema } from "@/lib/validation/order";
import { buildQuote } from "@/services/order.service";

/** Live totals for the staff "new order" form (allows dine-in, ignores online-only limits). */
export const POST = apiRoute({ permission: "orders:create", body: quoteSchema }, async ({ body }) => buildQuote(body, { channel: "ADMIN" }));
