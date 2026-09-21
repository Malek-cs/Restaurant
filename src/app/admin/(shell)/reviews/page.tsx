import type { Metadata } from "next";
import { Suspense } from "react";
import { guardPage } from "@/lib/auth/page-guard";
import { ReviewsView } from "@/components/admin/reviews/reviews-view";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  await guardPage("reviews:manage");
  return <Suspense><ReviewsView /></Suspense>;
}
