import type { Metadata } from "next";
import { guardPage } from "@/lib/auth/page-guard";
import { WhatsAppView } from "@/components/admin/whatsapp/whatsapp-view";

export const metadata: Metadata = { title: "WhatsApp" };

export default async function WhatsAppPage() {
  await guardPage("whatsapp:manage");
  return <WhatsAppView />;
}
