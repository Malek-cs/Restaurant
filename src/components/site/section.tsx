import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, className, align = "center" }: { eyebrow?: string; title: string; className?: string; align?: "center" | "start" }) {
  return (
    <div className={cn(align === "center" ? "text-center" : "text-start", className)}>
      {eyebrow && <p className="text-[9px] uppercase tracking-[0.3em] opacity-55">{eyebrow}</p>}
      <h2 className="font-display mb-10 mt-3 text-[clamp(34px,4vw,48px)] font-normal tracking-[0.04em]">{title}</h2>
    </div>
  );
}
