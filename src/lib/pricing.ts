/** Pure pricing helpers — no I/O, safe on both client and server. All amounts are minor units (fils). */

export interface CouponLike {
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount?: number | null;
}

export function couponDiscount(coupon: CouponLike, subtotal: number): number {
  let d = coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) d = Math.min(d, coupon.maxDiscount);
  return Math.max(0, Math.min(d, subtotal));
}

export interface TotalsInput {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  taxRate: number; // percent
  serviceFeeRate: number; // percent
}

export interface Totals {
  subtotal: number;
  discountTotal: number;
  serviceFee: number;
  taxTotal: number;
  deliveryFee: number;
  total: number;
}

/** Tax and service fee are calculated on the discounted subtotal. Delivery fee is not discounted or taxed. */
export function computeTotals(i: TotalsInput): Totals {
  const net = Math.max(0, i.subtotal - i.discount);
  const serviceFee = Math.round((net * i.serviceFeeRate) / 100);
  const taxTotal = Math.round(((net + serviceFee) * i.taxRate) / 100);
  return {
    subtotal: i.subtotal,
    discountTotal: i.discount,
    serviceFee,
    taxTotal,
    deliveryFee: i.deliveryFee,
    total: net + serviceFee + taxTotal + i.deliveryFee,
  };
}

export function effectivePrice(p: { price: number; discountPrice: number | null }) {
  return p.discountPrice != null && p.discountPrice < p.price ? p.discountPrice : p.price;
}
