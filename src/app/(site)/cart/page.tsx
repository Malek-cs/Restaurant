import type { Metadata } from "next";
import { CartView } from "@/components/site/cart-view";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="px-[22px] pb-24 pt-12 md:px-[7vw]">
      <div className="mx-auto max-w-[1200px]">
        <p className="text-[9px] uppercase tracking-[0.3em] opacity-55">Review</p>
        <h1 className="font-display mb-10 mt-3 text-[clamp(40px,5vw,60px)] font-normal leading-none tracking-[0.02em]">Your cart</h1>
        <CartView />
      </div>
    </div>
  );
}
