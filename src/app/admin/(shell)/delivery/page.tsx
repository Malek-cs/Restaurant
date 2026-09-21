import type { Metadata } from "next";
import { guardPage } from "@/lib/auth/page-guard";
import { hasPermission } from "@/lib/auth/permissions";
import { DeliveryView } from "@/components/admin/delivery/delivery-view";

export const metadata: Metadata = { title: "Delivery" };

export default async function DeliveryPage() {
  const user = await guardPage(["delivery:view", "delivery:manage"]);
  return <DeliveryView canManage={hasPermission(user.permissions, "delivery:manage")} />;
}
