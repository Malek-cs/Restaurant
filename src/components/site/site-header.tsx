"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Moon, ShoppingBag, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useCart, cartCount } from "@/lib/cart-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const LEFT = [{ href: "/", label: "Home" }, { href: "/menu", label: "Menu" }, { href: "/about", label: "About" }];
const RIGHT = [{ href: "/contact", label: "Contact" }];

export function SiteHeader({ name, sub, logoUrl }: { name: string; sub: string; logoUrl: string | null }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const count = useCart((s) => cartCount(s.lines));
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const overlay = pathname === "/";
  useEffect(() => setOpen(false), [pathname]);

  const link = (l: { href: string; label: string }) => {
    const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
    return (
      <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={cn("text-[11px] uppercase tracking-[0.14em] transition-opacity hover:opacity-60", active ? "opacity-100" : "opacity-80")}>
        {l.label}
      </Link>
    );
  };

  const cart = (
    <Link href="/cart" className="relative flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] transition-opacity hover:opacity-60" aria-label={`Cart${hydrated && count ? `, ${count} items` : ""}`}>
      <ShoppingBag className="size-[18px]" />
      <span className="hidden sm:inline">Cart</span>
      {hydrated && count > 0 && <span className="tabular grid min-w-[18px] place-items-center rounded-full bg-[#8e947a] px-1 text-[10px] font-semibold leading-[18px] text-white">{count}</span>}
    </Link>
  );

  return (
    <header className={cn("z-30 h-[86px] border-b", overlay ? "absolute inset-x-0 top-0 border-white/10 text-white" : "sticky top-0 bg-background/90 text-foreground backdrop-blur")}>
      <div className="mx-auto flex h-full max-w-[1500px] items-center justify-between px-5 md:px-[4.5vw]">
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">{LEFT.map(link)}</nav>
        <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>

        <Link href="/" className="absolute start-1/2 flex -translate-x-1/2 flex-col items-center rtl:translate-x-1/2" aria-label={`${name} home`}>
          {logoUrl ? <Image src={logoUrl} alt={name} width={140} height={44} className="h-9 w-auto object-contain" priority /> : (
            <>
              <span className="font-display text-[26px] uppercase leading-none tracking-[0.17em] sm:text-[31px]">{name}</span>
              {sub && <span className="mt-0.5 text-[8px] uppercase tracking-[0.38em] opacity-80">{sub}</span>}
            </>
          )}
        </Link>

        <div className="flex items-center gap-5 md:gap-8">
          <nav className="hidden items-center gap-8 md:flex" aria-label="Secondary">{RIGHT.map(link)}</nav>
          <button className="opacity-80 transition-opacity hover:opacity-60" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {hydrated && theme === "dark" ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}
          </button>
          {cart}
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" width="max-w-[19rem]" className="bg-[#2b3025] text-[#eee7dc] border-white/10" hideClose>
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
          <div className="flex h-[86px] items-center px-6"><span className="font-display text-2xl uppercase tracking-[0.17em]">{name}</span></div>
          <nav className="flex flex-col gap-1 px-3" aria-label="Mobile">
            {[...LEFT, ...RIGHT, { href: "/cart", label: "Cart" }].map((l) => (
              <SheetClose asChild key={l.href}><Link href={l.href} className={cn("rounded-md px-3 py-3 font-display text-[26px] transition-colors hover:bg-white/10", pathname === l.href && "bg-white/10")}>{l.label}</Link></SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
