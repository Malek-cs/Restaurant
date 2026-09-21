import { z } from "zod";
import { email, id, minor, password, phone } from "./common";

const nullableText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`).nullish();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date").nullish().or(z.literal(""));

// ── Delivery zones
export const zoneSchema = z.object({
  name: z.string().trim().min(2, "Enter a zone name").max(60),
  description: nullableText(200),
  fee: minor,
  minOrder: minor,
  etaMinutes: z.number({ error: "Enter minutes" }).int().min(5, "At least 5 minutes").max(240),
  isActive: z.boolean(),
});

// ── Coupons
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,24}$/, "3–24 letters, numbers, - or _"),
    description: nullableText(200),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.number({ error: "Enter a value" }).int().min(1, "Must be greater than 0"),
    minOrder: minor,
    maxDiscount: minor.nullish(),
    startsAt: dateStr,
    expiresAt: dateStr,
    usageLimit: z.number().int().min(1).nullish(),
    perCustomerLimit: z.number().int().min(1).nullish(),
    isActive: z.boolean(),
    isPublic: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "PERCENT" && v.value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "Percentage can't exceed 100" });
    if (v.startsAt && v.expiresAt && v.expiresAt < v.startsAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiry must be after the start date" });
    }
  });

export const couponValidateSchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().int().min(0),
  phone: z.string().trim().max(20).optional(),
});

// ── Reviews
export const reviewStatusSchema = z.object({ status: z.enum(["PENDING", "APPROVED", "HIDDEN"]) });
export const reviewListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  status: z.enum(["PENDING", "APPROVED", "HIDDEN"]).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  q: z.string().trim().max(100).optional(),
});

// ── Customers
export const customerUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.union([email, z.literal("")]).nullish(),
  notes: nullableText(2000),
});
export const customerListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(["name", "orders", "spent", "lastOrder", "createdAt"]).default("createdAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

// ── Payments
export const paymentListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  q: z.string().trim().max(100).optional(),
  status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
  method: z.enum(["CASH", "ONLINE"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export const paymentUpdateSchema = z.object({ status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]) });

// ── Staff
export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  email,
  password,
  roleKey: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "KITCHEN", "DELIVERY"]),
  phone: z.union([phone, z.literal("")]).nullish(),
  position: nullableText(60),
  isActive: z.boolean(),
});
export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  email,
  password: z.union([password, z.literal("")]).nullish(),
  roleKey: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "KITCHEN", "DELIVERY"]),
  phone: z.union([phone, z.literal("")]).nullish(),
  position: nullableText(60),
  isActive: z.boolean(),
});

// ── Notifications
export const notificationListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  unread: z.enum(["1"]).optional(),
});

// ── WhatsApp
export const templateUpdateSchema = z.object({
  body: z.string().trim().min(5, "Write at least a short message").max(1000),
  isActive: z.boolean(),
});
export const whatsappSendSchema = z
  .object({
    templateKey: z.enum(["ORDER_CONFIRMED", "ORDER_READY", "OUT_FOR_DELIVERY", "ORDER_COMPLETED", "PROMOTION"]),
    orderId: id.optional(),
    customerId: id.optional(),
    promoCode: z.string().trim().max(40).optional(),
  })
  .refine((v) => v.orderId || v.customerId, { message: "Choose an order or a customer" });

// ── Account
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Choose a different password" });

export const loginSchema = z.object({
  email: email,
  password: z.string().min(1, "Enter your password").max(128),
});

// ── Settings
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
export const restaurantProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter the restaurant name").max(80),
  tagline: nullableText(80),
  description: nullableText(500),
  story: nullableText(1200),
  logoUrl: z.string().max(500).nullish(),
  coverImageUrl: z.string().max(500).nullish(),
  phone: nullableText(30),
  whatsappNumber: z.union([phone, z.literal("")]).nullish(),
  email: z.union([email, z.literal("")]).nullish(),
  address: nullableText(200),
  city: nullableText(60),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  instagramUrl: z.union([z.string().url("Enter a full URL"), z.literal("")]).nullish(),
  facebookUrl: z.union([z.string().url("Enter a full URL"), z.literal("")]).nullish(),
  tiktokUrl: z.union([z.string().url("Enter a full URL"), z.literal("")]).nullish(),
});

export const businessSettingsSchema = z.object({
  currency: z.enum(["JOD", "USD", "EUR", "AED", "SAR", "KWD", "QAR", "EGP"]),
  taxRate: z.number({ error: "Enter a rate" }).min(0).max(50),
  serviceFeeRate: z.number({ error: "Enter a rate" }).min(0).max(30),
  minOrderAmount: minor,
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  acceptingOrders: z.boolean(),
  hours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        isClosed: z.boolean(),
        opensAt: hhmm,
        closesAt: hhmm,
      }),
    )
    .length(7),
});

export const notificationSettingsSchema = z.object({
  emailNewOrder: z.boolean(),
  emailDailySummary: z.boolean(),
  emailRecipients: z.string().trim().max(300),
  whatsappOnConfirmed: z.boolean(),
  whatsappOnReady: z.boolean(),
  whatsappOnOutForDelivery: z.boolean(),
  whatsappOnCompleted: z.boolean(),
  alertNewOrderSound: z.boolean(),
  alertLowStock: z.boolean(),
});

export type ZoneInput = z.output<typeof zoneSchema>;
export type CouponInput = z.output<typeof couponSchema>;
export type CouponFormValues = z.input<typeof couponSchema>;
export type StaffCreateInput = z.output<typeof staffCreateSchema>;
export type StaffUpdateInput = z.output<typeof staffUpdateSchema>;
export type RestaurantProfileInput = z.output<typeof restaurantProfileSchema>;
export type BusinessSettingsInput = z.output<typeof businessSettingsSchema>;
export type NotificationSettingsInput = z.output<typeof notificationSettingsSchema>;
