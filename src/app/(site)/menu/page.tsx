import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicMenu } from "@/services/menu.service";
import { MenuBrowser } from "@/components/site/menu-browser";

export const metadata: Metadata = { title: "Menu", description: "Explore our full menu — mezze, mains, burgers, pizza, drinks and desserts." };

export default async function MenuPage() {
  const { categories, products } = await getPublicMenu();
  return (
    <div className="px-[22px] pb-24 pt-14 md:px-[7vw]">
      <div className="mx-auto max-w-[1200px]">
        <p className="text-[9px] uppercase tracking-[0.3em] opacity-55">Order online</p>
        <h1 className="font-display mt-3 text-[clamp(44px,6vw,72px)] font-normal leading-none tracking-[0.02em]">Our menu</h1>
        <p className="mt-4 max-w-lg text-[14px] font-light leading-relaxed text-muted-foreground">Cooked to order with seasonal ingredients. Choose your dishes, then delivery or pickup at checkout.</p>
        <Suspense>
          <MenuBrowser categories={categories} products={products} />
        </Suspense>
      </div>
    </div>
  );
}
