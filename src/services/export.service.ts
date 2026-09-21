import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import type { AuthUser } from "@/types/auth";
import type { ExportDataset } from "@/lib/export/types";
import type { RangePreset } from "@/lib/dates";
import { titleCase } from "@/utils/format";
import { listOrders } from "./order.service";
import { listCustomers } from "./customer.service";
import { listPayments } from "./payment.service";
import { getRevenueReport } from "./analytics.service";
import { getRestaurant } from "./restaurant.service";
import type { OrderListQuery } from "@/lib/validation/order";
import type { PaymentQuery } from "./payment.service";

export type ExportType = "orders" | "customers" | "payments" | "revenue";

const stamp = (tz: string) => formatInTimeZone(new Date(), tz, "yyyyMMdd-HHmm");

export async function buildExport(
  type: ExportType,
  params: Record<string, string | undefined>,
  user: AuthUser,
): Promise<ExportDataset> {
  const r = await getRestaurant();
  const tz = r.timezone;
  const dt = (d: Date | null | undefined) => (d ? formatInTimeZone(d, tz, "yyyy-MM-dd HH:mm") : "");

  if (type === "orders") {
    const base = { ...params, page: 1, pageSize: 100, sort: "placedAt", dir: "desc" } as unknown as OrderListQuery;
    const rows: ExportDataset["rows"] = [];
    for (let page = 1; page <= 50; page++) {
      const res = await listOrders({ ...base, page }, user);
      for (const o of res.rows) {
        rows.push({
          number: o.number,
          placedAt: dt(o.placedAt),
          customer: o.customer.name,
          phone: o.customer.phone,
          type: titleCase(o.type),
          status: titleCase(o.status),
          zone: o.zoneName ?? "",
          items: o._count.items,
          subtotal: o.subtotal,
          discount: o.discountTotal,
          delivery: o.deliveryFee,
          tax: o.taxTotal,
          total: o.total,
          paymentMethod: o.payment ? titleCase(o.payment.method) : "",
          paymentStatus: o.payment ? titleCase(o.payment.status) : "",
          coupon: o.couponCode ?? "",
        });
      }
      if (rows.length >= res.total) break;
    }
    return {
      title: "Orders",
      filename: `orders-${stamp(tz)}`,
      currency: r.currency,
      columns: [
        { key: "number", header: "Order #", type: "number", width: 10 },
        { key: "placedAt", header: "Placed at", width: 18 },
        { key: "customer", header: "Customer", width: 22 },
        { key: "phone", header: "Phone", width: 16 },
        { key: "type", header: "Type", width: 10 },
        { key: "status", header: "Status", width: 16 },
        { key: "zone", header: "Zone", width: 14 },
        { key: "items", header: "Items", type: "number", width: 8 },
        { key: "subtotal", header: `Subtotal (${r.currency})`, type: "money" },
        { key: "discount", header: `Discount (${r.currency})`, type: "money" },
        { key: "delivery", header: `Delivery (${r.currency})`, type: "money" },
        { key: "tax", header: `Tax (${r.currency})`, type: "money" },
        { key: "total", header: `Total (${r.currency})`, type: "money" },
        { key: "paymentMethod", header: "Payment", width: 10 },
        { key: "paymentStatus", header: "Payment status", width: 14 },
        { key: "coupon", header: "Coupon", width: 12 },
      ],
      rows,
    };
  }

  if (type === "customers") {
    const res = await listCustomers({ page: 1, pageSize: 100, q: params.q, sort: "createdAt", dir: "desc", all: true });
    return {
      title: "Customers",
      filename: `customers-${stamp(tz)}`,
      currency: r.currency,
      columns: [
        { key: "name", header: "Name", width: 24 },
        { key: "phone", header: "Phone", width: 16 },
        { key: "email", header: "Email", width: 26 },
        { key: "orders", header: "Orders", type: "number", width: 8 },
        { key: "spent", header: `Total spent (${r.currency})`, type: "money" },
        { key: "lastOrder", header: "Last order", width: 18 },
        { key: "registered", header: "Registered", width: 18 },
      ],
      rows: res.rows.map((c) => ({
        name: c.name,
        phone: c.phone,
        email: c.email ?? "",
        orders: c.orders,
        spent: c.spent,
        lastOrder: dt(c.lastOrderAt),
        registered: dt(c.createdAt),
      })),
    };
  }

  if (type === "payments") {
    const q = { ...params, page: 1, pageSize: 100 } as unknown as PaymentQuery;
    const rows: ExportDataset["rows"] = [];
    for (let page = 1; page <= 50; page++) {
      const res = await listPayments({ ...q, page });
      for (const p of res.rows) {
        rows.push({
          order: p.order.number,
          customer: p.order.customer.name,
          method: titleCase(p.method),
          status: titleCase(p.status),
          amount: p.amount,
          date: dt(p.createdAt),
          paidAt: dt(p.paidAt),
          reference: p.providerRef ?? "",
        });
      }
      if (rows.length >= res.total) break;
    }
    return {
      title: "Payments",
      filename: `payments-${stamp(tz)}`,
      currency: r.currency,
      columns: [
        { key: "order", header: "Order #", type: "number", width: 10 },
        { key: "customer", header: "Customer", width: 22 },
        { key: "method", header: "Method", width: 10 },
        { key: "status", header: "Status", width: 12 },
        { key: "amount", header: `Amount (${r.currency})`, type: "money" },
        { key: "date", header: "Date", width: 18 },
        { key: "paidAt", header: "Paid at", width: 18 },
        { key: "reference", header: "Reference", width: 22 },
      ],
      rows,
    };
  }

  const report = await getRevenueReport({
    range: (params.range as RangePreset) ?? "last30",
    from: params.from,
    to: params.to,
  });
  return {
    title: "Revenue report",
    subtitle: `${report.range.fromKey} to ${report.range.toKey}`,
    filename: `revenue-${report.range.fromKey}_${report.range.toKey}`,
    currency: r.currency,
    columns: [
      { key: "day", header: "Date", width: 12 },
      { key: "orders", header: "Orders", type: "number", width: 8 },
      { key: "revenue", header: `Revenue (${r.currency})`, type: "money" },
      { key: "average", header: `Avg order (${r.currency})`, type: "money" },
      { key: "discounts", header: `Discounts (${r.currency})`, type: "money" },
      { key: "tax", header: `Tax (${r.currency})`, type: "money" },
      { key: "delivery", header: `Delivery fees (${r.currency})`, type: "money" },
      { key: "cancelled", header: "Cancelled", type: "number", width: 10 },
    ],
    rows: report.rows.map((d) => ({ ...d, average: d.orders ? Math.round(d.revenue / d.orders) : 0 })),
  };
}
