import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getRestaurant } from "@/services/restaurant.service";
import { HoursList } from "@/components/site/visit";

export const metadata: Metadata = { title: "About", description: "The story behind our kitchen." };

const IMG = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=85";

export default async function AboutPage() {
  const r = await getRestaurant();
  return (
    <>
      <section className="grid min-h-[520px] bg-[#2b3025] text-[#f5efe6] md:grid-cols-2">
        <div className="relative min-h-[320px]"><Image src={IMG} alt="" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /></div>
        <div className="flex flex-col justify-center px-[25px] py-[70px] md:px-[8vw]">
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-55">About {r.name}</p>
          <h1 className="font-display mb-6 mt-3 text-[clamp(40px,5vw,60px)] font-normal leading-[1.02] tracking-[0.02em]">A story of ingredients, fire &amp; time.</h1>
          <p className="max-w-[46ch] text-[14px] font-light leading-[1.9] opacity-80">{r.story ?? r.description}</p>
        </div>
      </section>
      <section className="px-[22px] py-[80px] md:px-[7vw]">
        <div className="mx-auto grid max-w-[1000px] gap-12 md:grid-cols-2">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-55">Opening hours</p>
            <h2 className="font-display mb-6 mt-3 text-[38px] font-normal tracking-[0.03em]">Come hungry</h2>
            <HoursList r={r} />
          </div>
          <div className="flex flex-col justify-center">
            <p className="font-display text-[28px] leading-snug">Can't make it in?</p>
            <p className="mt-3 max-w-md text-[14px] font-light leading-relaxed text-muted-foreground">Order our menu for delivery or pickup — cooked to order and tracked live from the kitchen to your door.</p>
            <Link href="/menu" className="mt-8 inline-flex w-fit items-center gap-[22px] bg-primary px-[22px] py-[15px] text-[10px] uppercase tracking-[0.15em] text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary-hover">Explore our menu</Link>
          </div>
        </div>
      </section>
    </>
  );
}
