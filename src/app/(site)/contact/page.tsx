import type { Metadata } from "next";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { getRestaurant, isOpenNow } from "@/services/restaurant.service";
import { whatsappLink } from "@/utils/phone";
import { HoursList, MapEmbed, directionsUrl } from "@/components/site/visit";
import { SocialIcon } from "@/components/site/social-icons";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const r = await getRestaurant();
  const open = isOpenNow(r);
  const item = "flex items-start gap-4 border-t py-5";
  return (
    <div className="grid min-h-[70vh] lg:grid-cols-2">
      <section className="px-[22px] py-[70px] md:px-[7vw]">
        <p className="text-[9px] uppercase tracking-[0.3em] opacity-55">Get in touch</p>
        <h1 className="font-display mb-3 mt-3 text-[clamp(44px,6vw,72px)] font-normal leading-none tracking-[0.02em]">Contact</h1>
        <p className={`mb-10 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] ${open ? "" : "opacity-70"}`}><span className={`size-2 rounded-full ${open ? "bg-[#5aa85a]" : "bg-[#c66a5c]"}`} />{open ? "Open now" : "Closed right now"}</p>
        <div className="max-w-md text-[14px]">
          <div className={item}><MapPin className="mt-0.5 size-4 shrink-0" /><div><p className="mb-1 text-[10px] uppercase tracking-[0.2em] opacity-55">Address</p><p className="font-light leading-relaxed">{r.address}<br />{r.city}</p><a href={directionsUrl(r)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[12px] underline">Get directions <ArrowUpRight className="size-3.5" /></a></div></div>
          {r.phone && <div className={item}><Phone className="mt-0.5 size-4 shrink-0" /><div><p className="mb-1 text-[10px] uppercase tracking-[0.2em] opacity-55">Phone</p><a href={`tel:${r.phone}`} className="font-light hover:underline">{r.phone}</a></div></div>}
          {r.whatsappNumber && <div className={item}><SocialIcon kind="whatsapp" className="mt-0.5 size-4 shrink-0" /><div><p className="mb-1 text-[10px] uppercase tracking-[0.2em] opacity-55">WhatsApp</p><a href={whatsappLink(r.whatsappNumber, `Hello ${r.name}!`)} target="_blank" rel="noreferrer" className="font-light hover:underline">Chat with us</a></div></div>}
          {r.email && <div className={item}><Mail className="mt-0.5 size-4 shrink-0" /><div><p className="mb-1 text-[10px] uppercase tracking-[0.2em] opacity-55">Email</p><a href={`mailto:${r.email}`} className="font-light hover:underline">{r.email}</a></div></div>}
          <div className={`${item} block`}><p className="mb-3 text-[10px] uppercase tracking-[0.2em] opacity-55">Opening hours</p><HoursList r={r} /></div>
        </div>
      </section>
      <section className="min-h-[420px] bg-muted"><MapEmbed r={r} className="h-full min-h-[420px] w-full border-0 grayscale-[35%] dark:invert-[.9] dark:hue-rotate-180" /></section>
    </div>
  );
}
