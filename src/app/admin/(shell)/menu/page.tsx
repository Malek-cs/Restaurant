import type { Metadata } from "next";
import { Suspense } from "react";
import { guardPage } from "@/lib/auth/page-guard";
import { hasPermission } from "@/lib/auth/permissions";
import { MenuView } from "@/components/admin/menu/menu-view";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const user = await guardPage(["menu:view", "menu:manage"]);
  return <Suspense><MenuView canManage={hasPermission(user.permissions, "menu:manage")} /></Suspense>;
}
