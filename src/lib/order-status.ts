import type { Permission } from "@/lib/auth/permissions";

export type OrderStatus = "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED";
export type OrderType = "DELIVERY" | "PICKUP" | "DINE_IN";

export const STATUS_META: Record<OrderStatus, { label: string; customerLabel: string; customerHint: string; adminAction: string }> = {
  NEW: { label: "New", customerLabel: "Order received", customerHint: "We've received your order and will confirm it shortly.", adminAction: "Mark new" },
  CONFIRMED: { label: "Confirmed", customerLabel: "Confirmed", customerHint: "The kitchen has accepted your order.", adminAction: "Confirm" },
  PREPARING: { label: "Preparing", customerLabel: "Preparing", customerHint: "Your food is being prepared.", adminAction: "Start preparation" },
  READY: { label: "Ready", customerLabel: "Ready", customerHint: "Your order is ready.", adminAction: "Mark ready" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", customerLabel: "Out for delivery", customerHint: "Your order is on its way.", adminAction: "Out for delivery" },
  COMPLETED: { label: "Completed", customerLabel: "Completed", customerHint: "Enjoy your meal!", adminAction: "Complete" },
  CANCELLED: { label: "Cancelled", customerLabel: "Cancelled", customerHint: "This order was cancelled.", adminAction: "Cancel" },
};

export const ACTIVE_STATUSES: OrderStatus[] = ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

/** The happy-path steps shown on the tracking page. Pickup orders skip "out for delivery". */
export function trackingSteps(type: OrderType): OrderStatus[] {
  return type === "DELIVERY"
    ? ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"]
    : ["NEW", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];
}

export function nextStatuses(order: { status: OrderStatus; type: OrderType }): OrderStatus[] {
  switch (order.status) {
    case "NEW":
      return ["CONFIRMED", "CANCELLED"];
    case "CONFIRMED":
      return ["PREPARING", "CANCELLED"];
    case "PREPARING":
      return ["READY", "CANCELLED"];
    case "READY":
      return [order.type === "DELIVERY" ? "OUT_FOR_DELIVERY" : "COMPLETED", "CANCELLED"];
    case "OUT_FOR_DELIVERY":
      return ["COMPLETED", "CANCELLED"];
    default:
      return [];
  }
}

/** Any-of permissions that allow a given transition. */
export function permissionsForTransition(from: OrderStatus, to: OrderStatus): Permission[] {
  switch (to) {
    case "CONFIRMED":
      return ["orders:confirm", "orders:manage"];
    case "PREPARING":
    case "READY":
      return ["orders:kitchen", "orders:manage"];
    case "OUT_FOR_DELIVERY":
    case "COMPLETED":
      return ["orders:deliver", "orders:manage"];
    case "CANCELLED":
      return from === "NEW" ? ["orders:confirm", "orders:manage"] : ["orders:manage"];
    default:
      return ["orders:manage"];
  }
}

/** Label for an admin action button, e.g. NEW→CANCELLED reads "Reject". */
export function actionLabel(from: OrderStatus, to: OrderStatus): string {
  if (to === "CANCELLED") return from === "NEW" ? "Reject" : "Cancel order";
  return STATUS_META[to].adminAction;
}
