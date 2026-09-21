import { z } from "zod";
import { email, id, optionalText, phone } from "./common";

export const ORDER_STATUSES = ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"] as const;
export const ORDER_TYPES = ["DELIVERY", "PICKUP", "DINE_IN"] as const;

export const orderItemInput = z.object({
  productId: id,
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(50),
  optionIds: z.array(id).max(20).default([]),
  notes: z.string().trim().max(200).optional(),
});

export const quoteSchema = z.object({
  type: z.enum(ORDER_TYPES),
  zoneId: id.optional(),
  couponCode: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(20).optional(),
  items: z.array(orderItemInput).min(1, "Your cart is empty").max(60),
});

export const createOrderSchema = z
  .object({
    type: z.enum(ORDER_TYPES),
    customer: z.object({
      name: z.string().trim().min(2, "Enter your full name").max(80),
      phone,
      email: z.union([email, z.literal("")]).optional(),
    }),
    zoneId: id.optional(),
    addressLine: z.string().trim().max(200).optional(),
    building: z.string().trim().max(40).optional(),
    floor: z.string().trim().max(20).optional(),
    apartment: z.string().trim().max(20).optional(),
    deliveryNotes: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(300).optional(),
    paymentMethod: z.enum(["CASH", "CLIQ"]),
    couponCode: z.string().trim().max(40).optional(),
    items: z.array(orderItemInput).min(1, "Your cart is empty").max(60),
  })
  .superRefine((v, ctx) => {
    if (v.type === "DELIVERY") {
      if (!v.zoneId) ctx.addIssue({ code: "custom", path: ["zoneId"], message: "Choose your delivery area" });
      if (!v.addressLine || v.addressLine.length < 5) ctx.addIssue({ code: "custom", path: ["addressLine"], message: "Enter your street address" });
    }
  });

/** Staff-created orders: adds DINE_IN and the ability to record payment immediately. */
export const adminCreateOrderSchema = createOrderSchema.safeExtend({
  markPaid: z.boolean().default(false),
});

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).optional(),
});

export const assignDriverSchema = z.object({ driverId: id.nullable() });

export const orderListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  q: z.string().trim().max(100).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  type: z.enum(ORDER_TYPES).optional(),
  payment: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
  customerId: id.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  active: z.enum(["1"]).optional(),
  sort: z.enum(["number", "placedAt", "total", "status"]).default("placedAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

export const reviewSubmitSchema = z.object({
  rating: z.number().int().min(1, "Choose a rating").max(5),
  comment: z.string().trim().max(600).optional(),
});

export type CreateOrderInput = z.output<typeof createOrderSchema>;
export type QuoteInput = z.output<typeof quoteSchema>;
export type AdminCreateOrderInput = z.output<typeof adminCreateOrderSchema>;
export type OrderListQuery = z.output<typeof orderListQuery>;
