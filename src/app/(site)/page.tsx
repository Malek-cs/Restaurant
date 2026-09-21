import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import { getPublicMenu } from "@/services/menu.service";
import { getRestaurant } from "@/services/restaurant.service";
import { getPublicZones } from "@/services/delivery.service";
import { getPublicOffers } from "@/services/coupon.service";
import { getPublicReviews } from "@/services/review.service";
import { openStatus, to12h, DAY_LONG, todayIndex } from "@/lib/hours";
import { formatMoney } from "@/utils/money";
import { whatsappLink } from "@/utils/phone";
import { Hero } from "@/components/site/hero";
import { OrderBar } from "@/components/site/order-bar";
import { SectionHeading } from "@/components/site/section";
import { HighlightCard, DishCard } from "@/components/site/dish-card";
import { StarRating } from "@/components/shared/star-rating";
import { ProductImage } from "@/components/shared/product-image";
import { CopyCode } from "@/components/site/copy-code";
import { SocialIcon } from "@/components/site/social-icons";

// هذان السطران يمنعان Next.js من حفظ كاش للصفحة، مما يضمن تحديث حالة الوقت (Open/Closed) فوراً
export const dynamic = "force-dynamic";
export const revalidate = 0;

const STORY_IMAGE = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85";
const CTA_IMAGE = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2000&q=85";

export default async function HomePage() {
  const [r, menu, zones, offers, reviews] = await Promise.all([getRestaurant(), getPublicMenu(), getPublicZones(), getPublicOffers(), getPublicReviews(3)]);
  const status = openStatus(r.hours, r.timezone);
  const available = menu.products.filter((p) => p.isAvailable);
  const featured = (available.filter((p) => p.isFeatured).length >= 3 ? available.filter((p) => p.isFeatured) : [...available.filter((p) => p.isFeatured), ...available.filter((p) => p.isPopular && !p.isFeatured)]).slice(0, 3);
  const popular = available.filter((p) => p.isPopular).slice(0, 4);
  const discounted = available.filter((p) => p.discountPrice != null).slice(0, 3);
  const today = todayIndex(r.timezone);
  const mapSrc = r.latitude != null && r.longitude != null ? `https://www.google.com/maps?q=${r.latitude},${r.longitude}&z=16&output=embed` : r.address ? `https://www.google.com/maps?q=${encodeURIComponent(`${r.address}${r.city ?? ""}`)}&z=16&output=embed` : null;
  const directions = r.latitude != null ? `https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${r.address ?? ""} ${r.city ?? ""}`)}`;

  return (
    <>
      <header id="home">
        <Hero tagline={r.tagline ?? r.name} description={r.description ?? ""} kicker={`Seasonal dining · ${r.city?.split(",")[0] ?? ""}`} image={r.coverImageUrl} status={status} />
      </header>
      <OrderBar zones={zones} deliveryEnabled={r.deliveryEnabled} pickupEnabled={r.pickupEnabled} accepting={r.acceptingOrders} />

      {featured.length > 0 && (
        <section className="px-[22px] py-[70px] md:px-[7vw] md:py-[90px]" id="highlights">
          <SectionHeading eyebrow="Menu preview" title="Culinary Highlights" />
          <div className="mx-auto grid max-w-[1100px] gap-7 md:grid-cols-3">{featured.map((p) => <HighlightCard key={p.id} p={p} />)}</div>
          <div className="mt-[35px] text-center"><Link href="/menu" className="font-display inline-block border-b border-[#8e877b] pb-1 text-[15px]">View Full Menu</Link></div>
        </section>
      )}

      {r.story && (
        <section className="grid min-h-[560px] bg-[#2b3025] text-[#f5efe6] md:min-h-[650px] md:grid-cols-[1.05fr_.95fr]" id="about">
          <div className="relative min-h-[380px]"><Image src={STORY_IMAGE} alt="" fill sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" /></div>
          <div className="flex flex-col justify-center px-[25px] py-[70px] md:px-[8vw] md:py-[10vw]">
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-55">Our philosophy</p>
            <h2 className="font-display mb-5 mt-3 text-[clamp(34px,4vw,48px)] font-normal leading-[1.05] tracking-[0.02em]">A story of ingredients, fire &amp; time.</h2>
            <p className="max-w-[430px] text-[13.5px] font-light leading-[1.9] opacity-75">{r.story}</p>
            <Link href="/about" className="font-display mt-8 inline-block w-fit border-b border-[#aaa] pb-1 text-[15px]">Discover our story</Link>
          </div>
        </section>
      )}

      <section className="px-[22px] py-[70px] md:px-[7vw] md:py-[90px]" id="categories">
        <SectionHeading eyebrow="Browse" title="Every craving, covered" />
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {menu.categories.map((c) => (
            <Link key={c.id} href={`/menu?category=${c.slug}`} className="group relative block aspect-[4/3] overflow-hidden bg-[#2b3025] text-white md:aspect-[16/10]">
              <ProductImage src={c.imageUrl} alt={c.name} className="absolute inset-0 transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 380px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 md:p-5"><p className="font-display text-[26px] leading-none tracking-[0.04em]">{c.name}</p><p className="mt-1.5 text-[10px] uppercase tracking-[0.2em] opacity-80">{c.productCount} dishes</p></div>
            </Link>
          ))}
        </div>
      </section>

      {popular.length > 0 && (
        <section className="bg-muted/50 px-[22px] py-[70px] md:px-[7vw] md:py-[90px]" id="popular">
          <SectionHeading eyebrow="Most loved" title="Guest favourites" />
          <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">{popular.map((p) => <DishCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {(offers.length > 0 || discounted.length > 0) && (
        <section className="bg-[#30372a] px-[22px] py-[70px] text-[#f5efe6] md:px-[7vw] md:py-[90px]" id="offers">
          <SectionHeading eyebrow="Now on" title="Special offers" />
          <div className="mx-auto grid max-w-[1100px] gap-4 md:grid-cols-3">
            {offers.map((o) => (
              <div key={o.id} className="flex flex-col border border-white/20 p-6">
                <p className="font-display text-[44px] leading-none">{o.type === "PERCENT" ? `${o.value}%` : formatMoney(o.value, r.currency)}<span className="ms-2 text-[15px] tracking-wider opacity-70">off</span></p>
                <p className="mt-3 text-[13px] font-light leading-relaxed opacity-80">{o.description}{o.minOrder > 0 ? ` Minimum order ${formatMoney(o.minOrder, r.currency)}.` : ""}{o.expiresAt ? ` Ends ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: r.timezone }).format(o.expiresAt)}.` : ""}</p>
                <div className="mt-auto pt-6"><CopyCode code={o.code} /></div>
              </div>
            ))}
            {discounted.map((p) => (
              <Link key={p.id} href={`/menu/${p.slug}`} className="group flex flex-col border border-white/20 transition-colors hover:bg-white/5">
                <ProductImage src={p.imageUrl} alt={p.name} className="aspect-[16/9] w-full" sizes="360px" />
                <div className="p-5"><p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Chef&apos;s price</p><p className="font-display mt-1 text-[22px]">{p.name}</p><p className="font-display tabular mt-1 text-[17px]">{formatMoney(p.discountPrice!, r.currency)} <span className="ms-1 text-sm line-through opacity-50">{formatMoney(p.price, r.currency)}</span></p></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {reviews.count > 0 && (
        <section className="px-[22px] py-[70px] md:px-[7vw] md:py-[90px]" id="reviews">
          <SectionHeading eyebrow="Kind words" title="What guests say" className="mb-0" />
          <div className="mb-10 -mt-6 flex items-center justify-center gap-3"><StarRating value={reviews.average} size={18} /><span className="font-display tabular text-2xl">{reviews.average.toFixed(1)}</span><span className="text-[12px] opacity-60">from {reviews.count} reviews</span></div>
          <div className="mx-auto grid max-w-[1100px] gap-4 md:grid-cols-3">
            {reviews.reviews.map((rv) => (
              <figure key={rv.id} className="border bg-card p-6">
                <StarRating value={rv.rating} size={14} />
                <blockquote className="font-display mt-4 text-[19px] leading-[1.45]">“{rv.comment}”</blockquote>
                <figcaption className="mt-5 text-[11px] uppercase tracking-[0.18em] opacity-60">{rv.author}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-px bg-border md:grid-cols-2" id="visit">
        <div className="bg-background px-[22px] py-[70px] md:px-[7vw] md:py-[90px]">
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-55">Visit us</p>
          <h2 className="font-display mb-8 mt-3 text-[clamp(34px,4vw,48px)] font-normal tracking-[0.04em]">Hours &amp; location</h2>
          <ul className="max-w-sm divide-y text-[14px]">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const h = r.hours.find((x) => x.dayOfWeek === d);
              const isToday = d === today;
              return <li key={d} className={`flex justify-between py-3 ${isToday ? "font-medium" : "font-light opacity-80"}`}><span>{DAY_LONG[d]}{isToday && <span className="ms-2 text-[10px] uppercase tracking-widest text-primary">Today</span>}</span><span className="tabular">{!h || h.isClosed ? "Closed" : `${to12h(h.opensAt)} – ${to12h(h.closesAt)}`}</span></li>;
            })}
          </ul>
          <div className="mt-8 space-y-2 text-[14px] font-light">
            <p className="flex items-start gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0" /> {r.address}{r.city ? `, ${r.city}` : ""}</p>
            {r.phone && <p className="flex items-center gap-2.5"><Phone className="size-4 shrink-0" /><a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a></p>}
          </div>
          <a href={directions} target="_blank" rel="noreferrer" className="font-display mt-6 inline-flex items-center gap-2 border-b border-[#8e877b] pb-1 text-[15px]">Get directions <ArrowUpRight className="size-4" /></a>
        </div>
        <div className="min-h-[360px] bg-muted">
          {mapSrc && <iframe title={`Map showing ${r.name}`} src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-full min-h-[360px] w-full border-0 grayscale-[35%] dark:invert-[.9] dark:hue-rotate-180" />}
        </div>
      </section>

      <section id="contact" className="relative flex min-h-[470px] items-center justify-center overflow-hidden text-center text-white">
        <Image src={CTA_IMAGE} alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,13,9,.55),rgba(18,13,9,.68))]" />
        <div className="relative z-10 px-6">
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-70">Your table awaits</p>
          <h2 className="font-display mb-8 mt-3 text-[clamp(44px,6vw,72px)] font-normal leading-none tracking-[0.03em]">Make an evening of it.</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/menu" className="inline-flex items-center gap-[22px] bg-[#777d63] px-[22px] py-[15px] text-[10px] uppercase tracking-[0.15em] transition-all hover:-translate-y-0.5 hover:bg-[#8e947a]">Order online</Link>
            {r.whatsappNumber && <a href={whatsappLink(r.whatsappNumber, `Hello ${r.name}, I have a question.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 border border-white/50 px-[22px] py-[15px] text-[10px] uppercase tracking-[0.15em] transition-colors hover:bg-white/10"><SocialIcon kind="whatsapp" className="size-4" /> Chat on WhatsApp</a>}
          </div>
        </div>
      </section>
    </>
  );
}