// Client-safe: template keys, placeholders, default copy and renderer.

export const TEMPLATE_KEYS = ["ORDER_CONFIRMED", "ORDER_READY", "OUT_FOR_DELIVERY", "ORDER_COMPLETED", "PROMOTION"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const PLACEHOLDERS = [
  { key: "customer_name", description: "Customer's name", sample: "Omar" },
  { key: "order_id", description: "Order number", sample: "1042" },
  { key: "order_total", description: "Order total with currency", sample: "JOD 24.500" },
  { key: "order_type", description: "Delivery or pickup", sample: "delivery" },
  { key: "eta_minutes", description: "Estimated minutes", sample: "35" },
  { key: "restaurant_name", description: "Your restaurant's name", sample: "Lumière" },
  { key: "tracking_link", description: "Link to live order tracking", sample: "https://example.com/order/abc" },
  { key: "menu_link", description: "Link to your online menu", sample: "https://example.com/menu" },
  { key: "promo_code", description: "Coupon code (promotions)", sample: "WELCOME10" },
] as const;

export const TEMPLATE_DEFAULTS: Record<TemplateKey, { name: string; description: string; body: string }> = {
  ORDER_CONFIRMED: {
    name: "Order confirmation",
    description: "Sent when the kitchen accepts an order.",
    body: "Hello {customer_name}, your order #{order_id} has been confirmed. Total: {order_total}. Track it here: {tracking_link}",
  },
  ORDER_READY: {
    name: "Order ready",
    description: "Sent when the food is ready for pickup or dispatch.",
    body: "Good news, {customer_name}! Order #{order_id} is ready. Track it here: {tracking_link}",
  },
  OUT_FOR_DELIVERY: {
    name: "Out for delivery",
    description: "Sent when a driver picks up the order.",
    body: "Hello {customer_name}, order #{order_id} is on its way. Estimated arrival: about {eta_minutes} minutes. {tracking_link}",
  },
  ORDER_COMPLETED: {
    name: "Order completed",
    description: "Sent after the order is delivered or collected.",
    body: "Thank you, {customer_name}! Order #{order_id} is complete. We'd love to hear how it was: {tracking_link}",
  },
  PROMOTION: {
    name: "Promotional message",
    description: "For offers you send to customers by hand.",
    body: "Hello {customer_name}, {restaurant_name} has a treat for you. Use code {promo_code} on your next order: {menu_link}",
  },
};

export function renderTemplate(body: string, vars: Record<string, string | number | undefined>): string {
  return body.replace(/\{(\w+)\}/g, (match, key: string) => {
    const v = vars[key];
    return v === undefined || v === "" ? match : String(v);
  });
}

export function sampleVars(): Record<string, string> {
  return Object.fromEntries(PLACEHOLDERS.map((p) => [p.key, p.sample]));
}
