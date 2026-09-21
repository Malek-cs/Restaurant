import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

function HeroTitle({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const lines: { small: string[]; big: string }[] = [];
  let pending: string[] = [];
  for (const w of words) {
    if (w.length <= 3 && words.length > 1) pending.push(w);
    else { lines.push({ small: pending, big: w }); pending = []; }
  }
  if (pending.length) lines.push({ small: [], big: pending.join(" ") });
  return (
    <h1 className="font-display text-[clamp(60px,8vw,116px)] font-normal uppercase leading-[0.8] tracking-[-0.025em]">
      {lines.map((l, i) => (
        <span key={i} className="block">
          {l.small.length > 0 && <em className="me-[7px] text-[0.74em] font-normal normal-case italic">{l.small.join(" ")}</em>}
          {l.big}
        </span>
      ))}
    </h1>
  );
}

export function Hero({ tagline, description, kicker, image, status }: { tagline: string; description: string; kicker: string; image: string | null; status: { open: boolean; label: string } }) {
  return (
    <div className="relative min-h-[82vh] overflow-hidden bg-[#1b1711] text-white">
      {image && <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,12,8,.8)_0%,rgba(17,12,8,.42)_45%,rgba(17,12,8,.2)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.4),transparent_35%,rgba(0,0,0,.4))]" />
      <div className="relative z-[2] max-w-[640px] px-6 pb-[11vh] pt-[calc(86px+12vh)] md:ps-[10.5vw] md:pe-0">
        <div className="animate-slide-up">
          <p className="mb-5 text-[10px] uppercase tracking-[0.34em] opacity-75">{kicker}</p>
          <HeroTitle text={tagline} />
          <p className="mb-7 mt-8 max-w-[440px] text-[13.5px] font-light leading-[1.8] text-white/85">{description}</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/menu" className="inline-flex items-center gap-[22px] bg-[#777d63] px-[22px] py-[15px] text-[10px] uppercase tracking-[0.15em] transition-all hover:-translate-y-0.5 hover:bg-[#8e947a]">Explore our menu <ArrowUpRight className="size-3.5" /></Link>
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-white/80"><span className={cn("size-2 rounded-full", status.open ? "bg-[#8fce7a]" : "bg-[#e08a7a]")} aria-hidden />{status.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
