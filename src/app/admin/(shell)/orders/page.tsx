import type { Metadata } from "next";
import { Suspense } from "react";
import { guardPage } from "@/lib/auth/page-guard";
import { hasPermission } from "@/lib/auth/permissions";
import { OrdersView } from "@/components/admin/orders/orders-view";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const user = await guardPage(["orders:view", "orders:view_assigned", "orders:manage"]);
  return (
    <Suspense>
      <OrdersView
        canCreate={hasPermission(user.permissions, "orders:create")}
        canExport={hasPermission(user.permissions, "export:data")}
        defaultActive={user.role.key === "KITCHEN" || user.role.key === "DELIVERY"}
      />
    </Suspense>
  );
}
