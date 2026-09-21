"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-store";
import { effectivePrice } from "@/lib/pricing";
import type { PublicProduct } from "@/services/menu.service";
import { cn } from "@/lib/utils";

/** One-tap add for simple dishes; dishes with sizes or add-ons open their page instead. */
export function QuickAdd({ product, className }: { product: PublicProduct; className?: string }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const needsChoice = product.options.length > 0;

  return (
    <button
      type="button"
      disabled={!product.isAvailable}
      aria-label={needsChoice ? `Choose options for ${product.name}` : `Add ${product.name} to cart`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (needsChoice) return router.push(`/menu/${product.slug}`);
        add({ productId: product.id, slug: product.slug, name: product.name, imageUrl: product.imageUrl, unitPrice: effectivePrice(product), quantity: 1, options: [] });
        toast.success(`${product.name} added to your cart`);
      }}
      className={cn("grid size-9 place-items-center rounded-full border border-current/25 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40", className)}
    >
      <Plus className="size-4" />
    </button>
  );
}
