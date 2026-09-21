import Link from "next/link";
import { Flame } from "lucide-react";
import type { PublicProduct } from "@/services/menu.service";
import { ProductImage } from "@/components/shared/product-image";
import { Price } from "@/components/site/price";
import { QuickAdd } from "@/components/site/quick-add";
import { cn } from "@/lib/utils";

/** Reference-style highlight card: image, centred name, ingredients line, price. */
export function HighlightCard({ p }: { p: PublicProduct }) {
  return (
    <article className="group">
      <Link href={`/menu/${p.slug}`} className="block overflow-hidden">
        <ProductImage src={p.imageUrl} alt={p.name} className="aspect-[1.55] w-full transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.045]" sizes="(max-width: 768px) 100vw, 360px" />
      </Link>
      <div className="pt-[17px] text-center">
        <h3 className="font-display text-[19px] font-medium tracking-[0.06em]"><Link href={`/menu/${p.slug}`}>{p.name}</Link></h3>
        <p className="mx-auto mb-2 mt-1.5 max-w-[26ch] text-[11px] leading-relaxed opacity-60">{p.ingredients.slice(0, 4).join(", ") || p.description}</p>
        <Price price={p.price} discountPrice={p.discountPrice} className="text-base" />
      </div>
    </article>
  );
}

/** Menu grid card with a quick-add button. */
export function DishCard({ p, className }: { p: PublicProduct; className?: string }) {
  return (
    <article className={cn("group flex flex-col", className)}>
      <Link href={`/menu/${p.slug}`} className="relative block overflow-hidden rounded-md">
        <ProductImage src={p.imageUrl} alt={p.name} className="aspect-[4/3] w-full transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.04]" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px" />
        <div className="absolute start-2 top-2 flex flex-wrap gap-1.5">
          {!p.isAvailable && <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white">Sold out</span>}
          {p.isAvailable && p.isPopular && <span className="inline-flex items-center gap-1 rounded-full bg-[#f6efe1] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#7a5a12]"><Flame className="size-3" /> Popular</span>}
          {p.discountPrice != null && p.isAvailable && <span className="rounded-full bg-[#4d5440] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white">Offer</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[19px] font-medium leading-tight tracking-[0.03em]"><Link href={`/menu/${p.slug}`}>{p.name}</Link></h3>
          <QuickAdd product={p} className="-mt-0.5 shrink-0" />
        </div>
        {p.description && <p className="mt-1.5 line-clamp-2 text-[12.5px] font-light leading-relaxed text-muted-foreground">{p.description}</p>}
        <div className="mt-auto pt-3"><Price price={p.price} discountPrice={p.discountPrice} from={p.options.some((o) => o.type === "SIZE" && o.priceDelta < 0)} className="text-[17px]" /></div>
      </div>
    </article>
  );
}
