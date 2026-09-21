import { apiRoute } from "@/lib/api/handler";
import { couponSchema } from "@/lib/validation/admin";
import { createCoupon, listCoupons } from "@/services/coupon.service";

export const GET = apiRoute({ permission: "discounts:manage" }, async () => listCoupons());

export const POST = apiRoute({ permission: "discounts:manage", body: couponSchema }, async ({ body, user, audit }) => {
  const c = await createCoupon(body);
  await audit({ action: "coupon.created", entity: "Coupon", entityId: c.id, summary: `${user.name} created coupon ${c.code}.` });
  return c;
});
