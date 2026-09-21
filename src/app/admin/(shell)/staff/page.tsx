import type { Metadata } from "next";
import { guardPage } from "@/lib/auth/page-guard";
import { hasPermission } from "@/lib/auth/permissions";
import { StaffView } from "@/components/admin/staff/staff-view";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const user = await guardPage(["staff:view", "staff:manage"]);
  return <StaffView canManage={hasPermission(user.permissions, "staff:manage")} me={{ id: user.id, roleKey: user.role.key, rank: user.role.rank }} />;
}
