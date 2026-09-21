import { apiRouteWith } from "@/lib/api/handler";
import { reviewSubmitSchema } from "@/lib/validation/order";
import { submitReview } from "@/services/review.service";

export const POST = apiRouteWith<{ id: string }>()({ public: true, body: reviewSubmitSchema, rateLimit: { key: "review", limit: 10, windowMs: 60 * 60_000 } }, async ({ params, body }) => {
  await submitReview(params.id, body);
  return { ok: true };
});
