import type { Metadata } from "next";
import { Suspense } from "react";
import { guardPage } from "@/lib/auth/page-guard";
import { SettingsView } from "@/components/admin/settings/settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await guardPage("settings:manage");
  return <Suspense><SettingsView /></Suspense>;
}
