import type { Metadata } from "next";
import { Suspense } from "react";
import { guardPage } from "@/lib/auth/page-guard";
import { hasPermission } from "@/lib/auth/permissions";
import { AnalyticsView } from "@/components/admin/analytics/analytics-view";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await guardPage("analytics:view");
  return <Suspense><AnalyticsView canExport={hasPermission(user.permissions, "export:data")} /></Suspense>;
}
