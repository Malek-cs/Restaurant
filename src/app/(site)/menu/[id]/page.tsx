import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { getPublicProduct } from "@/services/menu.service";
import { ProductImage } from "@/components/shared/product-image";
import { ProductPurchase } from "@/components/site/product-purchase";
import { DishCard } from "@/components/site/dish-card";
import { Price } from "@/components/site/price";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicProduct(id);
  return data ? { title: data.product.name, description: data.product.description ?? undefined } : { title: "Dish not found" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPublicProduct(id);
  if (!data) notFound();
  const { product: p, related } = data;

  return (
    <div className="px-[22px] pb-24 pt-10 md:px-[7vw]">
      <div className="mx-auto max-w-[1200px]">
        <nav aria-label="Breadcrumb" className="mb-8 text-[11px] uppercase tracking-[0.16em] opacity-60"><Link href="/menu" className="hover:opacity-100">Menu</Link> <span className="mx-2">/</span> <Link href={`/menu`} className="hover:opacity-100">{p.categoryName}</Link></nav>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductImage src={p.imageUrl} alt={p.name} priority className="aspect-[4/3] w-full rounded-md lg:aspect-square" sizes="(max-width: 1024px) 100vw, 560px" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-55">{p.categoryName}</p>
            <h1 className="font-display mt-3 text-[clamp(40px,5vw,60px)] font-normal leading-[1.02] tracking-[0.01em]">{p.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2"><Price price={p.price} discountPrice={p.discountPrice} className="text-[26px]" /><span className="inline-flex items-center gap-1.5 text-[12px] opacity-65"><Clock className="size-3.5" /> ~{p.prepTimeMinutes} min</span></div>
            {p.description && <p className="mt-6 max-w-[52ch] text-[15px] font-light leading-[1.8] text-muted-foreground">{p.description}</p>}

            {(p.ingredients.length > 0 || p.allergens.length > 0) && (
              <dl className="mt-7 space-y-5 border-y py-6 text-[13px]">
                {p.ingredients.length > 0 && <div><dt className="mb-2 text-[10px] uppercase tracking-[0.2em] opacity-55">Ingredients</dt><dd className="font-light leading-relaxed">{p.ingredients.join(" · ")}</dd></div>}
                {p.allergens.length > 0 && <div><dt className="mb-2 text-[10px] uppercase tracking-[0.2em] opacity-55">Contains</dt><dd className="flex flex-wrap gap-2">{p.allergens.map((a) => <span key={a} className="rounded-full border px-3 py-1 text-[12px]">{a}</span>)}</dd></div>}
              </dl>
            )}
            <ProductPurchase product={p} />
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24" aria-labelledby="related">
            <h2 id="related" className="font-display mb-8 text-[34px] font-normal tracking-[0.03em]">You might also like</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:gap-x-7">{related.map((r) => <DishCard key={r.id} p={r} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
