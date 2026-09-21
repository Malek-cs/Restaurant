import "server-only";
import { db } from "@/database/client";
import type { Prisma } from "@/generated/prisma/client";
import { conflict, forbidden, notFound, unprocessable } from "@/lib/api/errors";
import { hasPermission } from "@/lib/auth/permissions";
import { getEmailProvider } from "@/lib/email";
import {
  ACTIVE_STATUSES,
  nextStatuses,
  permissionsForTransition,
  type OrderStatus,
} from "@/lib/order-status";
import { getPaymentProvider } from "@/lib/payments";
import { computeTotals, effectivePrice } from "@/lib/pricing";
import { addDaysKey, startOfDayInTz } from "@/lib/dates";
import type { AdminCreateOrderInput, CreateOrderInput, OrderListQuery, QuoteInput } from "@/lib/validation/order";
import { formatMoney } from "@/utils/money";
import { normalizePhone } from "@/utils/phone";
import type { AuthUser } from "@/types/auth";
import { CouponError, validateCoupon } from "./coupon.service";
import { createNotification } from "./notification.service";
import { getNotificationSettings, getRestaurant } from "./restaurant.service";
import { queueStatusMessage } from "./whatsapp.service";
import { invalidate } from "@/lib/cache";

// ───────────────────────── Quote ─────────────────────────

export interface QuoteLine {
  productId: string;
  name: string;
  categoryName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
  options: { id: string; type: "SIZE" | "ADDON"; name: string; priceDelta: number }[];
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  deliveryFee: number;
  discountTotal: number;
  serviceFee: number;
  taxTotal: number;
  total: number;
  currency: string;
  taxRate: number;
  serviceFeeRate: number;
  zone: { id: string; name: string; fee: number; minOrder: number; etaMinutes: number } | null;
  coupon: { code: string; discount: number; description: string | null } | null;
  couponError: string | null;
  etaMinutes: number;
  /** Problems that block checkout (unavailable items, minimum order …) */
  issues: string[];
  /** Cart lines the customer should remove or fix */
  invalidItems: { productId: string; reason: string }[];
  acceptingOrders: boolean;
}

type LineInput = { productId: string; quantity: number; optionIds: string[]; notes?: string };

async function resolveLines(items: LineInput[]) {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await db.product.findMany({
    where: { id: { in: ids } },
    include: { options: true, category: true },
  });
  const map = new Map(products.map((p) => [p.id, p]));
  const lines: QuoteLine[] = [];
  const invalidItems: { productId: string; reason: string }[] = [];
  const perProductQty = new Map<string, number>();

  for (const it of items) {
    const p = map.get(it.productId);
    if (!p) {
      invalidItems.push({ productId: it.productId, reason: "This item is no longer on the menu." });
      continue;
    }
    perProductQty.set(p.id, (perProductQty.get(p.id) ?? 0) + it.quantity);

    if (!p.isAvailable || !p.category.isActive) {
      invalidItems.push({ productId: p.id, reason: `${p.name} is currently unavailable.` });
    }

    const active = p.options.filter((o) => o.isActive);
    const chosen = it.optionIds.map((oid) => active.find((o) => o.id === oid));
    if (chosen.some((o) => !o)) {
      invalidItems.push({ productId: p.id, reason: `An option for ${p.name} is no longer available.` });
      continue;
    }
    let opts = chosen as typeof active;
    const sizes = active.filter((o) => o.type === "SIZE");
    const chosenSizes = opts.filter((o) => o.type === "SIZE");
    if (chosenSizes.length > 1) {
      invalidItems.push({ productId: p.id, reason: `Choose a single size for ${p.name}.` });
      continue;
    }
    if (sizes.length && chosenSizes.length === 0) {
      const def = sizes.find((s) => s.isDefault) ?? sizes[0]!;
      opts = [def, ...opts];
    }

    const unitPrice = effectivePrice(p) + opts.reduce((s, o) => s + o.priceDelta, 0);
    lines.push({
      productId: p.id,
      name: p.name,
      categoryName: p.category.name,
      imageUrl: p.imageUrl,
      quantity: it.quantity,
      unitPrice,
      lineTotal: unitPrice * it.quantity,
      notes: it.notes || undefined,
      options: opts.map((o) => ({ id: o.id, type: o.type, name: o.name, priceDelta: o.priceDelta })),
    });
  }

  for (const [pid, qty] of perProductQty) {
    const p = map.get(pid)!;
    if (p.trackStock && (p.stock ?? 0) < qty) {
      invalidItems.push({ productId: pid, reason: p.stock && p.stock > 0 ? `Only ${p.stock} of ${p.name} left.` : `${p.name} is sold out.` });
    }
  }
  return { lines, invalidItems, products: map };
}

export async function buildQuote(
  input: QuoteInput,
  opts: { throwOnCouponError?: boolean; channel: "WEB" | "ADMIN" } = { channel: "WEB" },
): Promise<Quote> {
  const r = await getRestaurant();
  const { lines, invalidItems } = await resolveLines(input.items);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const issues: string[] = invalidItems.map((i) => i.reason);

  if (opts.channel === "WEB") {
    if (!r.acceptingOrders) issues.push("We're not taking online orders right now. Please check back soon.");
    if (input.type === "DINE_IN") issues.push("Dine-in isn't available online.");
    if (input.type === "DELIVERY" && !r.deliveryEnabled) issues.push("Delivery is currently unavailable. Choose pickup instead.");
    if (input.type === "PICKUP" && !r.pickupEnabled) issues.push("Pickup is currently unavailable. Choose delivery instead.");
  }

  let zone: Quote["zone"] = null;
  if (input.type === "DELIVERY" && input.zoneId) {
    const z = await db.deliveryZone.findUnique({ where: { id: input.zoneId } });
    if (!z || !z.isActive) issues.push("That delivery area isn't available. Choose another one.");
    else zone = { id: z.id, name: z.name, fee: z.fee, minOrder: z.minOrder, etaMinutes: z.etaMinutes };
  }

  if (opts.channel === "WEB") {
    const minimum = Math.max(r.minOrderAmount, input.type === "DELIVERY" ? (zone?.minOrder ?? 0) : 0);
    if (minimum > 0 && subtotal < minimum) {
      issues.push(`The minimum order is ${formatMoney(minimum, r.currency)}${zone ? ` for ${zone.name}` : ""}.`);
    }
  }

  let coupon: Quote["coupon"] = null;
  let couponError: string | null = null;
  let discount = 0;
  if (input.couponCode) {
    try {
      const v = await validateCoupon(input.couponCode, subtotal, input.phone);
      coupon = { code: v.coupon.code, discount: v.discount, description: v.coupon.description };
      discount = v.discount;
    } catch (e) {
      if (e instanceof CouponError && !opts.throwOnCouponError) couponError = e.message;
      else throw e;
    }
  }

  const deliveryFee = input.type === "DELIVERY" && zone ? zone.fee : 0;
  const totals = computeTotals({ subtotal, discount, deliveryFee, taxRate: r.taxRate, serviceFeeRate: r.serviceFeeRate });
  const prep = await estimatePrepMinutes(lines);
  const etaMinutes = input.type === "DELIVERY" ? Math.max(zone?.etaMinutes ?? 40, prep + 10) : prep + 5;

  return {
    lines,
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    discountTotal: totals.discountTotal,
    serviceFee: totals.serviceFee,
    taxTotal: totals.taxTotal,
    total: totals.total,
    currency: r.currency,
    taxRate: r.taxRate,
    serviceFeeRate: r.serviceFeeRate,
    zone,
    coupon,
    couponError,
    etaMinutes,
    issues: [...new Set(issues)],
    invalidItems,
    acceptingOrders: r.acceptingOrders,
  };
}

async function estimatePrepMinutes(lines: QuoteLine[]) {
  if (!lines.length) return 15;
  const products = await db.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } }, select: { prepTimeMinutes: true } });
  return Math.max(10, ...products.map((p) => p.prepTimeMinutes));
}

// ───────────────────────── Create ─────────────────────────

export async function createOrder(
  input: CreateOrderInput | AdminCreateOrderInput,
  ctx: { source: "WEB" | "ADMIN"; actor?: AuthUser | null },
) {
  const r = await getRestaurant();
  const markPaid = "markPaid" in input ? input.markPaid : false;

  if (input.paymentMethod === "ONLINE" && !getPaymentProvider()) {
    throw unprocessable("Online payment isn't available right now.", { paymentMethod: "Choose cash instead" });
  }

  const quote = await buildQuote(
    { type: input.type, zoneId: input.zoneId, couponCode: input.couponCode, phone: input.customer.phone, items: input.items },
    { channel: ctx.source, throwOnCouponError: true },
  );
  if (quote.issues.length) throw unprocessable(quote.issues[0]!);

  const phone = normalizePhone(input.customer.phone);
  const initialStatus: OrderStatus = ctx.source === "ADMIN" ? "CONFIRMED" : "NEW";
  const actorName = ctx.actor?.name ?? "Customer";

  const order = await db.$transaction(async (tx) => {
    // Customer (identified by phone). Existing names aren't overwritten by web orders.
    let customer = await tx.customer.findUnique({ where: { phone } });
    if (!customer) {
      customer = await tx.customer.create({ data: { name: input.customer.name, phone, email: input.customer.email || null } });
    } else if (!customer.email && input.customer.email) {
      customer = await tx.customer.update({ where: { id: customer.id }, data: { email: input.customer.email } });
    }

    // Coupon usage (optimistic concurrency so the limit can't be exceeded by parallel orders)
    let couponId: string | null = null;
    if (quote.coupon) {
      const c = await tx.coupon.findUniqueOrThrow({ where: { code: quote.coupon.code } });
      if (c.usageLimit != null && c.usedCount >= c.usageLimit) throw new CouponError("That code has reached its usage limit.");
      const upd = await tx.coupon.updateMany({ where: { id: c.id, usedCount: c.usedCount }, data: { usedCount: { increment: 1 } } });
      if (upd.count !== 1) throw conflict("That code was just used up. Please review your order and try again.");
      couponId = c.id;
    }

    // Stock (atomic conditional decrement)
    const qtyByProduct = new Map<string, number>();
    for (const l of quote.lines) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.quantity);
    for (const [productId, qty] of qtyByProduct) {
      const p = await tx.product.findUnique({ where: { id: productId }, select: { trackStock: true, name: true } });
      if (!p?.trackStock) continue;
      const upd = await tx.product.updateMany({ where: { id: productId, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
      if (upd.count !== 1) throw conflict(`${p.name} just sold out. Please update your cart.`);
    }

    const now = new Date();
    return tx.order.create({
      data: {
        customerId: customer.id,
        type: input.type,
        source: ctx.source,
        status: initialStatus,
        subtotal: quote.subtotal,
        deliveryFee: quote.deliveryFee,
        discountTotal: quote.discountTotal,
        serviceFee: quote.serviceFee,
        taxTotal: quote.taxTotal,
        total: quote.total,
        couponId,
        couponCode: quote.coupon?.code ?? null,
        zoneId: quote.zone?.id ?? null,
        zoneName: quote.zone?.name ?? null,
        addressLine: input.type === "DELIVERY" ? input.addressLine || null : null,
        building: input.type === "DELIVERY" ? input.building || null : null,
        floor: input.type === "DELIVERY" ? input.floor || null : null,
        apartment: input.type === "DELIVERY" ? input.apartment || null : null,
        deliveryNotes: input.type === "DELIVERY" ? input.deliveryNotes || null : null,
        notes: input.notes || null,
        estimatedReadyAt: new Date(now.getTime() + quote.etaMinutes * 60_000),
        items: {
          create: quote.lines.map((l) => ({
            productId: l.productId,
            productName: l.name,
            categoryName: l.categoryName,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
            notes: l.notes ?? null,
            options: { create: l.options.map((o) => ({ type: o.type, name: o.name, priceDelta: o.priceDelta })) },
          })),
        },
        payment: {
          create: {
            method: input.paymentMethod,
            amount: quote.total,
            status: markPaid ? "PAID" : "PENDING",
            paidAt: markPaid ? now : null,
          },
        },
        events: {
          create:
            ctx.source === "ADMIN"
              ? [
                  { status: "NEW", actorId: ctx.actor?.id ?? null, actorName, note: "Order created by staff" },
                  { status: "CONFIRMED", actorId: ctx.actor?.id ?? null, actorName },
                ]
              : [{ status: "NEW", actorName }],
        },
      },
      include: { customer: true, payment: true },
    });
  });

  // Online payment (after the order exists so we have an id to reference)
  if (input.paymentMethod === "ONLINE") {
    const provider = getPaymentProvider()!;
    try {
      const res = await provider.charge({
        orderId: order.id,
        orderNumber: order.number,
        amount: order.total,
        currency: r.currency,
        customer: { name: order.customer.name, phone: order.customer.phone, email: order.customer.email },
      });
      await db.payment.update({
        where: { orderId: order.id },
        data: {
          status: res.status,
          provider: provider.id,
          providerRef: res.providerRef ?? null,
          paidAt: res.status === "PAID" ? new Date() : null,
        },
      });
    } catch (e) {
      console.error("[payment] charge failed", e);
      await db.payment.update({ where: { orderId: order.id }, data: { status: "FAILED", provider: provider.id } });
    }
  }

  void afterOrderCreated(order.id, ctx.source);
  invalidate("menu"); // stock may have changed availability
  return { id: order.id, number: order.number };
}

async function afterOrderCreated(orderId: string, source: "WEB" | "ADMIN") {
  try {
    const [order, r, settings] = await Promise.all([
      db.order.findUniqueOrThrow({ where: { id: orderId }, include: { customer: true, payment: true, items: { include: { product: true } } } }),
      getRestaurant(),
      getNotificationSettings(),
    ]);

    if (source === "WEB") {
      await createNotification({
        type: "NEW_ORDER",
        title: `New order #${order.number}`,
        body: `${order.customer.name} · ${formatMoney(order.total, r.currency)} · ${order.type.toLowerCase()}`,
        link: `/admin/orders/${order.id}`,
      });
      if (settings.emailNewOrder && settings.emailRecipients.trim()) {
        const to = settings.emailRecipients.split(/[,;\s]+/).filter(Boolean);
        await getEmailProvider().send({
          to,
          subject: `New order #${order.number} — ${formatMoney(order.total, r.currency)}`,
          text: `${order.customer.name} (${order.customer.phone}) placed a ${order.type.toLowerCase()} order.\n\n${order.items
            .map((i) => `${i.quantity} × ${i.productName}`)
            .join("\n")}\n\nTotal: ${formatMoney(order.total, r.currency)}`,
        });
      }
    }
    if (order.payment?.status === "PAID") {
      await createNotification({
        type: "PAYMENT_RECEIVED",
        title: `Payment received for #${order.number}`,
        body: formatMoney(order.payment.amount, r.currency),
        link: `/admin/orders/${order.id}`,
      });
    }

    if (settings.alertLowStock) {
      for (const item of order.items) {
        const p = item.product;
        if (p?.trackStock && p.stock != null && p.stock <= p.lowStockThreshold) {
          await createNotification({
            type: "LOW_STOCK",
            title: `Low stock: ${p.name}`,
            body: p.stock === 0 ? "Sold out" : `${p.stock} left`,
            link: "/admin/menu",
          });
        }
      }
    }
  } catch (e) {
    console.error("[order] post-create tasks failed", e);
  }
}

// ───────────────────────── Read ─────────────────────────

function driverScopeOnly(user: AuthUser) {
  return !hasPermission(user.permissions, ["orders:view", "orders:manage"]) && hasPermission(user.permissions, "orders:view_assigned");
}

export async function listOrders(q: OrderListQuery, user: AuthUser) {
  const r = await getRestaurant();
  const base: Prisma.OrderWhereInput = {};
  const and: Prisma.OrderWhereInput[] = [];

  if (driverScopeOnly(user)) and.push({ driverId: user.id });
  if (q.type) and.push({ type: q.type });
  if (q.customerId) and.push({ customerId: q.customerId });
  if (q.payment) and.push({ payment: { status: q.payment } });
  if (q.active) and.push({ status: { in: ACTIVE_STATUSES } });
  if (q.from) and.push({ placedAt: { gte: startOfDayInTz(q.from, r.timezone) } });
  if (q.to) and.push({ placedAt: { lt: startOfDayInTz(addDaysKey(q.to, 1), r.timezone) } });
  if (q.q) {
    const term = q.q.replace(/^#/, "");
    const or: Prisma.OrderWhereInput[] = [
      { customer: { name: { contains: term, mode: "insensitive" } } },
      { customer: { phone: { contains: term.replace(/[\s-]/g, "") } } },
      { couponCode: { contains: term, mode: "insensitive" } },
    ];
    if (/^\d{1,9}$/.test(term)) or.push({ number: Number(term) });
    and.push({ OR: or });
  }
  const whereNoStatus: Prisma.OrderWhereInput = { ...base, AND: and };
  const where: Prisma.OrderWhereInput = q.status ? { AND: [...and, { status: q.status }] } : whereNoStatus;

  const orderBy: Prisma.OrderOrderByWithRelationInput[] = [{ [q.sort]: q.dir }, { id: "desc" }];

  const [total, rows, grouped] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        payment: { select: { id: true, method: true, status: true } },
        driver: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    db.order.groupBy({ by: ["status"], where: whereNoStatus, _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = g._count._all;
  return { total, rows, counts };
}

export async function getOrder(id: string, user?: AuthUser) {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      payment: true,
      driver: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
      items: { include: { options: true }, orderBy: { id: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "desc" }, take: 10 },
      review: true,
    },
  });
  if (!order) throw notFound("Order");
  if (user && driverScopeOnly(user) && order.driverId !== user.id) throw forbidden("This order isn't assigned to you.");
  return order;
}

/** Public tracking view. The unguessable order id acts as the access token. */
export async function getPublicOrder(id: string) {
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { options: true }, orderBy: { id: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
      payment: { select: { method: true, status: true } },
      review: { select: { id: true, rating: true, status: true } },
      customer: { select: { name: true } },
    },
  });
  if (!o) return null;
  return {
    id: o.id,
    number: o.number,
    type: o.type,
    status: o.status,
    placedAt: o.placedAt,
    estimatedReadyAt: o.estimatedReadyAt,
    cancelReason: o.cancelReason,
    customerName: o.customer.name,
    zoneName: o.zoneName,
    addressLine: o.addressLine,
    building: o.building,
    floor: o.floor,
    apartment: o.apartment,
    notes: o.notes,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    discountTotal: o.discountTotal,
    serviceFee: o.serviceFee,
    taxTotal: o.taxTotal,
    total: o.total,
    couponCode: o.couponCode,
    payment: o.payment,
    review: o.review,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      notes: i.notes,
      options: i.options.map((op) => ({ name: op.name, priceDelta: op.priceDelta })),
    })),
    events: o.events.map((e) => ({ status: e.status, createdAt: e.createdAt })),
  };
}

// ───────────────────────── Transitions ─────────────────────────

export async function transitionOrder(orderId: string, to: OrderStatus, user: AuthUser, note?: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payment: true, items: true, customer: true },
  });
  if (!order) throw notFound("Order");
  if (driverScopeOnly(user) && order.driverId !== user.id) throw forbidden("This order isn't assigned to you.");

  const from = order.status as OrderStatus;
  const allowed = nextStatuses({ status: from, type: order.type });
  if (!allowed.includes(to)) {
    throw conflict(`An order that's ${from.toLowerCase().replace(/_/g, " ")} can't be moved to ${to.toLowerCase().replace(/_/g, " ")}.`);
  }
  if (!hasPermission(user.permissions, permissionsForTransition(from, to))) throw forbidden();

  if (to === "OUT_FOR_DELIVERY" && !order.driverId && user.role.key !== "DELIVERY") {
    throw conflict("Assign a driver before sending this order out for delivery.");
  }
  if (to === "CANCELLED" && !note?.trim() && from !== "NEW") {
    throw unprocessable("Add a reason so the team knows why this order was cancelled.", { note: "A reason is required" });
  }

  const updated = await db.$transaction(async (tx) => {
    const now = new Date();
    const data: Prisma.OrderUpdateInput = { status: to };
    if (to === "OUT_FOR_DELIVERY" && !order.driverId && user.role.key === "DELIVERY") {
      data.driver = { connect: { id: user.id } };
    }
    if (to === "COMPLETED") data.completedAt = now;
    if (to === "CANCELLED") data.cancelReason = note?.trim() || "Rejected by restaurant";

    // Cash is collected on delivery/pickup, so completing settles it.
    if (to === "COMPLETED" && order.payment && order.payment.method === "CASH" && order.payment.status === "PENDING") {
      await tx.payment.update({ where: { id: order.payment.id }, data: { status: "PAID", paidAt: now } });
    }

    if (to === "CANCELLED") {
      for (const it of order.items) {
        if (!it.productId) continue;
        await tx.product.updateMany({ where: { id: it.productId, trackStock: true }, data: { stock: { increment: it.quantity } } });
      }
      if (order.couponId) {
        await tx.coupon.updateMany({ where: { id: order.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
      }
      if (order.payment) {
        if (order.payment.status === "PENDING") await tx.payment.update({ where: { id: order.payment.id }, data: { status: "FAILED" } });
        else if (order.payment.status === "PAID") await tx.payment.update({ where: { id: order.payment.id }, data: { status: "REFUNDED", refundedAt: now } });
      }
    }

    await tx.orderStatusEvent.create({
      data: { orderId, status: to, actorId: user.id, actorName: user.name, note: note?.trim() || null },
    });
    return tx.order.update({ where: { id: orderId }, data, include: { payment: true } });
  });

  const r = await getRestaurant();
  if (to === "CANCELLED") {
    await createNotification({
      type: "ORDER_CANCELLED",
      title: `Order #${order.number} cancelled`,
      body: note?.trim() || order.customer.name,
      link: `/admin/orders/${order.id}`,
    });
    invalidate("menu");
  }
  if (to === "COMPLETED" && order.payment?.method === "CASH" && order.payment.status === "PENDING") {
    await createNotification({
      type: "PAYMENT_RECEIVED",
      title: `Cash received for #${order.number}`,
      body: formatMoney(order.total, r.currency),
      link: `/admin/orders/${order.id}`,
    });
  }
  await queueStatusMessage(orderId, to);

  return { order: updated, from, number: order.number };
}

export async function assignDriver(orderId: string, driverId: string | null, user: AuthUser) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order");
  if (order.type !== "DELIVERY") throw conflict("Only delivery orders can be assigned to a driver.");
  if (order.status === "COMPLETED" || order.status === "CANCELLED") throw conflict("This order is already closed.");

  let driverName: string | null = null;
  if (driverId) {
    const d = await db.user.findUnique({ where: { id: driverId }, include: { role: true } });
    if (!d || !d.isActive || d.role.key !== "DELIVERY") throw unprocessable("Choose an active delivery driver.", { driverId: "Choose a driver" });
    driverName = d.name;
  }
  await db.$transaction([
    db.order.update({ where: { id: orderId }, data: { driverId } }),
    db.orderStatusEvent.create({
      data: {
        orderId,
        status: order.status,
        actorId: user.id,
        actorName: user.name,
        note: driverName ? `Assigned to ${driverName}` : "Driver unassigned",
      },
    }),
  ]);
  return { number: order.number, driverName };
}

export async function listDrivers() {
  const users = await db.user.findMany({
    where: { isActive: true, role: { key: "DELIVERY" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return users;
}

