import type { Metadata } from "next";
import { Suspense } from "react";
import { guardPage } from "@/lib/auth/page-guard";
import { hasPermission } from "@/lib/auth/permissions";
import { PaymentsView } from "@/components/admin/payments/payments-view";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const user = await guardPage("payments:view");
  return <Suspense><PaymentsView canUpdate={hasPermission(user.permissions, "payments:update")} canExport={hasPermission(user.permissions, "export:data")} /></Suspense>;
}
