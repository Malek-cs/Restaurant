import type { Metadata } from "next";
import { guardPage } from "@/lib/auth/page-guard";
import { hasPermission } from "@/lib/auth/permissions";
import { CustomerProfileView } from "@/components/admin/customers/customer-profile-view";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await guardPage("customers:view");
  const { id } = await params;
  return <CustomerProfileView id={id} canEdit={hasPermission(user.permissions, "customers:manage")} canOpenOrders={hasPermission(user.permissions, ["orders:view", "orders:manage"])} />;
}
