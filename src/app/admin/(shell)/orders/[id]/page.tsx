import type { Metadata } from "next";
import { guardPage } from "@/lib/auth/page-guard";
import { OrderDetailView } from "@/components/admin/orders/order-detail-view";

export const metadata: Metadata = { title: "Order details" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await guardPage(["orders:view", "orders:view_assigned", "orders:manage"]);
  const { id } = await params;
  return <OrderDetailView id={id} permissions={user.permissions} roleKey={user.role.key} />;
}
