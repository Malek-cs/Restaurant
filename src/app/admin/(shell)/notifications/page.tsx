import type { Metadata } from "next";
import { Suspense } from "react";
import { guardPage } from "@/lib/auth/page-guard";
import { NotificationsView } from "@/components/admin/notifications/notifications-view";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await guardPage("notifications:view");
  return <Suspense><NotificationsView /></Suspense>;
}
