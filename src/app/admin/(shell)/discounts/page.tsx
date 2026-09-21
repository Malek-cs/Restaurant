import type { Metadata } from "next";
import { Suspense } from "react";
import { guardPage } from "@/lib/auth/page-guard";
import { DiscountsView } from "@/components/admin/discounts/discounts-view";

export const metadata: Metadata = { title: "Discounts" };

export default async function DiscountsPage() {
  await guardPage("discounts:manage");
  return <Suspense><DiscountsView /></Suspense>;
}
