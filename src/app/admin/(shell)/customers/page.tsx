import type { Metadata } from "next";
import { Suspense } from "react";
import { guardPage } from "@/lib/auth/page-guard";
import { hasPermission } from "@/lib/auth/permissions";
import { CustomersView } from "@/components/admin/customers/customers-view";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const user = await guardPage("customers:view");
  return <Suspense><CustomersView canExport={hasPermission(user.permissions, "export:data")} /></Suspense>;
}
