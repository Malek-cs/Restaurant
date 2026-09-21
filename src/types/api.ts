import type { getOrder, listOrders, getPublicOrder, Quote } from "@/services/order.service";
import type { listProductsAdmin, listCategoriesAdmin, PublicProduct } from "@/services/menu.service";
import type { listCustomers, getCustomerProfile } from "@/services/customer.service";
import type { listPayments } from "@/services/payment.service";
import type { listCoupons } from "@/services/coupon.service";
import type { listReviews } from "@/services/review.service";
import type { listStaff, getRoleMatrix } from "@/services/staff.service";
import type { listZones } from "@/services/delivery.service";
import type { listTemplates, listMessageLogs } from "@/services/whatsapp.service";
import type { listAuditLogs } from "@/services/audit.service";
import type { RestaurantDTO } from "@/services/restaurant.service";

/** What a value looks like after crossing JSON: Dates become ISO strings. */
export type Serialized<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

type R<F extends (...a: never[]) => Promise<unknown>> = Serialized<Awaited<ReturnType<F>>>;

export type OrderList = R<typeof listOrders>;
export type OrderRow = OrderList["rows"][number];
export type OrderDetail = R<typeof getOrder>;
export type PublicOrder = NonNullable<R<typeof getPublicOrder>>;
export type QuoteResult = Serialized<Quote>;
export type ProductList = R<typeof listProductsAdmin>;
export type ProductRow = ProductList["rows"][number];
export type CategoryRow = R<typeof listCategoriesAdmin>[number];
export type CustomerList = R<typeof listCustomers>;
export type CustomerProfile = R<typeof getCustomerProfile>;
export type PaymentList = R<typeof listPayments>;
export type CouponRow = R<typeof listCoupons>[number];
export type ReviewList = R<typeof listReviews>;
export type StaffRow = R<typeof listStaff>[number];
export type RoleMatrix = R<typeof getRoleMatrix>;
export type ZoneRow = R<typeof listZones>[number];
export type TemplateRow = R<typeof listTemplates>[number];
export type MessageLogList = R<typeof listMessageLogs>;
export type AuditList = R<typeof listAuditLogs>;
export type Restaurant = Serialized<RestaurantDTO>;
export type { PublicProduct };
