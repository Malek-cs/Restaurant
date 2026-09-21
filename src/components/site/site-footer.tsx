import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { RestaurantDTO } from "@/services/restaurant.service";
import { groupedHours } from "@/lib/hours";
import { SocialIcon } from "@/components/site/social-icons";

export function SiteFooter({ r }: { r: RestaurantDTO }) {
  const hours = groupedHours(r.hours);
  const social = [
    { href: r.instagramUrl, kind: "instagram" as const, label: "Instagram" },
    { href: r.facebookUrl, kind: "facebook" as const, label: "Facebook" },
    { href: r.tiktokUrl, kind: "tiktok" as const, label: "TikTok" },
  ].filter((s) => s.href);
  return (
    <footer className="bg-[#1e1c17] px-[7vw] pb-9 pt-16 text-[#eee7dc]">
      <div className="flex flex-col justify-between gap-12 lg:flex-row">
        <div>
          <p className="font-display text-[32px] uppercase leading-none tracking-[0.15em]">{r.name}</p>
          {r.city && <p className="mt-1.5 text-[9px] uppercase tracking-[0.28em] opacity-50">{r.city.split(",")[0]}</p>}
          {r.description && <p className="mt-5 max-w-xs text-[13px] font-light leading-relaxed opacity-60">{r.description}</p>}
          {social.length > 0 && (
            <div className="mt-6 flex gap-3">
              {social.map((s) => (
                <a key={s.kind} href={s.href!} target="_blank" rel="noreferrer" aria-label={s.label} className="grid size-9 place-items-center rounded-full border border-white/20 opacity-80 transition-opacity hover:opacity-100"><SocialIcon kind={s.kind} className="size-4" /></a>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-10 sm:grid-cols-3 lg:gap-[70px]">
          <div>
            <h4 className="text-[9px] uppercase tracking-[0.2em] opacity-50">Visit</h4>
            <p className="mt-3 flex gap-2 text-[12px] leading-loose opacity-80"><MapPin className="mt-1.5 size-3.5 shrink-0" /><span>{r.address}<br />{r.city}</span></p>
            {r.phone && <a href={`tel:${r.phone}`} className="mt-1 flex items-center gap-2 text-[12px] leading-loose opacity-80 hover:opacity-100"><Phone className="size-3.5" /> {r.phone}</a>}
            {r.email && <a href={`mailto:${r.email}`} className="flex items-center gap-2 text-[12px] leading-loose opacity-80 hover:opacity-100"><Mail className="size-3.5" /> {r.email}</a>}
          </div>
          <div>
            <h4 className="text-[9px] uppercase tracking-[0.2em] opacity-50">Hours</h4>
            <ul className="mt-3 text-[12px] leading-loose opacity-80">{hours.map((h) => <li key={h.days}>{h.days}<br /><span className={h.closed ? "opacity-70" : ""}>{h.value}</span></li>)}</ul>
          </div>
          <div>
            <h4 className="text-[9px] uppercase tracking-[0.2em] opacity-50">Explore</h4>
            <nav className="mt-3 flex flex-col text-[12px] leading-loose opacity-80" aria-label="Footer">
              <Link href="/menu" className="hover:opacity-100">Menu</Link><Link href="/about" className="hover:opacity-100">About</Link><Link href="/contact" className="hover:opacity-100">Contact</Link><Link href="/cart" className="hover:opacity-100">Your cart</Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="mt-12 border-t border-white/10 pt-5 text-[9px] uppercase tracking-[0.12em] opacity-45">© {new Date().getFullYear()} {r.name} · All rights reserved</div>
    </footer>
  );
}
