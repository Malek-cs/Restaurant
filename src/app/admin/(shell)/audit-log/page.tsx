import type { Metadata } from "next";
import { Suspense } from "react";
import { guardPage } from "@/lib/auth/page-guard";
import { AuditView } from "@/components/admin/audit/audit-view";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage() {
  await guardPage("audit:view");
  return <Suspense><AuditView /></Suspense>;
}
