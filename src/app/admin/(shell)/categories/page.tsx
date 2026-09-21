import type { Metadata } from "next";
import { guardPage } from "@/lib/auth/page-guard";
import { CategoriesView } from "@/components/admin/menu/categories-view";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await guardPage("categories:manage");
  return <CategoriesView />;
}
