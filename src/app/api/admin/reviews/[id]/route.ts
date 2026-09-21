import { apiRouteWith } from "@/lib/api/handler";
import { reviewStatusSchema } from "@/lib/validation/admin";
import { deleteReview, setReviewStatus } from "@/services/review.service";
import { invalidate } from "@/lib/cache";

export const PATCH = apiRouteWith<{ id: string }>()({ permission: "reviews:manage", body: reviewStatusSchema }, async ({ params, body, user, audit }) => {
  const { review, from, customerName } = await setReviewStatus(params.id, body.status);
  invalidate("reviews");
  await audit({ action: "review.moderated", entity: "Review", entityId: review.id, summary: `${user.name} changed ${customerName}'s review from ${from} to ${body.status}.` });
  return review;
});

export const DELETE = apiRouteWith<{ id: string }>()({ permission: "reviews:manage" }, async ({ params, user, audit }) => {
  const r = await deleteReview(params.id);
  invalidate("reviews");
  await audit({ action: "review.deleted", entity: "Review", entityId: r.id, summary: `${user.name} deleted a review by ${r.customer.name}.` });
  return { ok: true };
});
