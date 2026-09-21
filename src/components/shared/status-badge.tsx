import { Badge, type Tone } from "@/components/ui/badge";
import { STATUS_META, type OrderStatus } from "@/lib/order-status";

const orderTone: Record<OrderStatus, Tone> = {
  NEW: "amber",
  CONFIRMED: "blue",
  PREPARING: "orange",
  READY: "green",
  OUT_FOR_DELIVERY: "violet",
  COMPLETED: "olive",
  CANCELLED: "red",
};

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as OrderStatus;
  return (
    <Badge tone={orderTone[s] ?? "gray"} dot className={className}>
      {STATUS_META[s]?.label ?? status}
    </Badge>
  );
}

const paymentTone: Record<string, Tone> = { PAID: "green", PENDING: "amber", FAILED: "red", REFUNDED: "gray" };
export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={paymentTone[status] ?? "gray"} dot>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

export function OrderTypeBadge({ type }: { type: string }) {
  const label = type === "DINE_IN" ? "Dine-in" : type.charAt(0) + type.slice(1).toLowerCase();
  return <Badge tone="gray">{label}</Badge>;
}
