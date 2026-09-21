import { cn } from "@/lib/utils";

export type Tone = "amber" | "blue" | "orange" | "green" | "violet" | "olive" | "red" | "gray";

const tones: Record<Tone, string> = {
  amber: "bg-[var(--tone-amber-bg)] text-[var(--tone-amber-fg)]",
  blue: "bg-[var(--tone-blue-bg)] text-[var(--tone-blue-fg)]",
  orange: "bg-[var(--tone-orange-bg)] text-[var(--tone-orange-fg)]",
  green: "bg-[var(--tone-green-bg)] text-[var(--tone-green-fg)]",
  violet: "bg-[var(--tone-violet-bg)] text-[var(--tone-violet-fg)]",
  olive: "bg-[var(--tone-olive-bg)] text-[var(--tone-olive-fg)]",
  red: "bg-[var(--tone-red-bg)] text-[var(--tone-red-fg)]",
  gray: "bg-[var(--tone-gray-bg)] text-[var(--tone-gray-fg)]",
};

export function Badge({ tone = "gray", dot, className, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
