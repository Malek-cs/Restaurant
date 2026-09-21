import "server-only";
import { db } from "@/database/client";
import { env } from "@/lib/env";
import { ApiError, notFound } from "@/lib/api/errors";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";
import { renderTemplate, TEMPLATE_DEFAULTS, TEMPLATE_KEYS, type TemplateKey } from "@/lib/whatsapp/templates";
import { formatMoney } from "@/utils/money";
import { getNotificationSettings, getRestaurant } from "./restaurant.service";

export async function listTemplates() {
  const rows = await db.messageTemplate.findMany();
  return TEMPLATE_KEYS.map((key) => {
    const row = rows.find((r) => r.key === key);
    return {
      key,
      name: TEMPLATE_DEFAULTS[key].name,
      description: TEMPLATE_DEFAULTS[key].description,
      body: row?.body ?? TEMPLATE_DEFAULTS[key].body,
      isActive: row?.isActive ?? true,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export async function updateTemplate(key: TemplateKey, input: { body: string; isActive: boolean }) {
  return db.messageTemplate.upsert({
    where: { key },
    create: { key, name: TEMPLATE_DEFAULTS[key].name, body: input.body, isActive: input.isActive },
    update: { body: input.body, isActive: input.isActive },
  });
}

async function getTemplate(key: TemplateKey) {
  const row = await db.messageTemplate.findUnique({ where: { key } });
  return { body: row?.body ?? TEMPLATE_DEFAULTS[key].body, isActive: row?.isActive ?? true };
}

const trackingLink = (orderId: string) => `${env().APP_URL}/order/${orderId}`;

interface OrderForMessage {
  id: string;
  number: number;
  type: string;
  total: number;
  estimatedReadyAt: Date | null;
  customer: { name: string; phone: string };
}

async function orderVars(o: OrderForMessage, extra: Record<string, string> = {}) {
  const r = await getRestaurant();
  const eta = o.estimatedReadyAt ? Math.max(5, Math.round((o.estimatedReadyAt.getTime() - Date.now()) / 60000)) : undefined;
  return {
    customer_name: o.customer.name.split(" ")[0],
    order_id: o.number,
    order_total: formatMoney(o.total, r.currency),
    order_type: o.type.toLowerCase().replace("_", " "),
    eta_minutes: eta ?? 30,
    restaurant_name: r.name,
    tracking_link: trackingLink(o.id),
    menu_link: `${env().APP_URL}/menu`,
    ...extra,
  };
}

const STATUS_TO_TEMPLATE: Partial<Record<string, { key: TemplateKey; setting: "whatsappOnConfirmed" | "whatsappOnReady" | "whatsappOnOutForDelivery" | "whatsappOnCompleted" }>> = {
  CONFIRMED: { key: "ORDER_CONFIRMED", setting: "whatsappOnConfirmed" },
  READY: { key: "ORDER_READY", setting: "whatsappOnReady" },
  OUT_FOR_DELIVERY: { key: "OUT_FOR_DELIVERY", setting: "whatsappOnOutForDelivery" },
  COMPLETED: { key: "ORDER_COMPLETED", setting: "whatsappOnCompleted" },
};

/** Called after an order changes status. Prepares (or, with an automatic provider, sends) the customer message. */
export async function queueStatusMessage(orderId: string, status: string) {
  const map = STATUS_TO_TEMPLATE[status];
  if (!map) return null;
  try {
    const settings = await getNotificationSettings();
    if (!settings[map.setting]) return null;
    const tpl = await getTemplate(map.key);
    if (!tpl.isActive) return null;
    const order = await db.order.findUnique({ where: { id: orderId }, include: { customer: true } });
    if (!order) return null;
    const body = renderTemplate(tpl.body, await orderVars(order));
    return await dispatch({ templateKey: map.key, orderId, to: order.customer.phone, body });
  } catch (e) {
    console.error("[whatsapp] queueStatusMessage failed", e);
    return null;
  }
}

async function dispatch(m: { templateKey: string; orderId?: string; to: string; body: string; sentByStaff?: boolean }) {
  const provider = getWhatsAppProvider();
  const result = await provider.send({ to: m.to, body: m.body, templateKey: m.templateKey });
  return db.messageLog.create({
    data: {
      templateKey: m.templateKey,
      orderId: m.orderId ?? null,
      to: m.to,
      body: m.body,
      provider: provider.id,
      status: m.sentByStaff && result.status === "QUEUED" ? "SENT" : result.status,
      link: result.link ?? null,
      error: result.error ?? null,
      sentAt: m.sentByStaff || result.status === "SENT" ? new Date() : null,
    },
  });
}

/** Staff-initiated message (order update or promotion). Returns the wa.me link to open. */
export async function sendManual(input: { templateKey: TemplateKey; orderId?: string; customerId?: string; promoCode?: string }) {
  const tpl = await getTemplate(input.templateKey);
  let vars: Record<string, string | number | undefined>;
  let to: string;
  let orderId: string | undefined;

  if (input.orderId) {
    const order = await db.order.findUnique({ where: { id: input.orderId }, include: { customer: true } });
    if (!order) throw notFound("Order");
    vars = await orderVars(order, input.promoCode ? { promo_code: input.promoCode } : {});
    to = order.customer.phone;
    orderId = order.id;
  } else {
    const customer = await db.customer.findUnique({ where: { id: input.customerId! } });
    if (!customer) throw notFound("Customer");
    const r = await getRestaurant();
    vars = {
      customer_name: customer.name.split(" ")[0],
      restaurant_name: r.name,
      menu_link: `${env().APP_URL}/menu`,
      promo_code: input.promoCode ?? "",
    };
    to = customer.phone;
  }
  if (input.templateKey === "PROMOTION" && !input.promoCode) {
    throw new ApiError(422, "VALIDATION_ERROR", "Add a promo code before sending a promotion.", { promoCode: "Enter a promo code" });
  }
  const body = renderTemplate(tpl.body, vars);
  return dispatch({ templateKey: input.templateKey, orderId, to, body, sentByStaff: true });
}

export async function markLogSent(id: string) {
  await db.messageLog.updateMany({ where: { id, status: "QUEUED" }, data: { status: "SENT", sentAt: new Date() } });
}

export async function listMessageLogs(q: { page: number; pageSize: number }) {
  const [total, rows] = await Promise.all([
    db.messageLog.count(),
    db.messageLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { order: { select: { number: true } } },
    }),
  ]);
  return { total, rows };
}
