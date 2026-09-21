import "server-only";
import { env } from "@/lib/env";

/**
 * Online payment abstraction. Checkout, orders and the admin UI only talk to
 * `PaymentProvider`. To connect a real gateway (Tap, HyperPay, Stripe, MPGS…)
 * implement this interface, return it from `getPaymentProvider`, and — for
 * redirect-based gateways — add a webhook route that flips the Payment to PAID.
 */
export interface ChargeInput {
  orderId: string;
  orderNumber: number;
  amount: number; // minor units
  currency: string;
  customer: { name: string; phone: string; email?: string | null };
}

export interface ChargeResult {
  status: "PAID" | "PENDING" | "FAILED";
  providerRef?: string;
  /** For redirect-based gateways: send the customer here to complete payment. */
  redirectUrl?: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly label: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
}

/** Demo provider — approves everything instantly. Never enable in production. */
class SandboxProvider implements PaymentProvider {
  readonly id = "sandbox";
  readonly label = "Card (demo)";
  async charge(input: ChargeInput): Promise<ChargeResult> {
    return { status: "PAID", providerRef: `sandbox_${input.orderNumber}_${Date.now()}` };
  }
}

export function getPaymentProvider(): PaymentProvider | null {
  switch (env().PAYMENT_PROVIDER) {
    case "sandbox":
      return new SandboxProvider();
    default:
      return null;
  }
}

export function getPaymentConfig() {
  const p = getPaymentProvider();
  return { cash: true, online: p ? { id: p.id, label: p.label } : null };
}
