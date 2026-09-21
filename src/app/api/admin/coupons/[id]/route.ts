import { apiRouteWith } from "@/lib/api/handler";
import { couponSchema } from "@/lib/validation/admin";
import { deleteCoupon, updateCoupon } from "@/services/coupon.service";

export const PUT = apiRouteWith<{ id: string }>()({ permission: "discounts:manage", body: couponSchema }, async ({ params, body, user, audit }) => {
  const c = await updateCoupon(params.id, body);
  await audit({ action: "coupon.updated", entity: "Coupon", entityId: c.id, summary: `${user.name} updated coupon ${c.code}.` });
  return c;
});

export const DELETE = apiRouteWith<{ id: string }>()({ permission: "discounts:manage" }, async ({ params, user, audit }) => {
  const c = await deleteCoupon(params.id);
  await audit({ action: "coupon.deleted", entity: "Coupon", entityId: c.id, summary: `${user.name} deleted coupon ${c.code}.` });
  return { ok: true };
});
