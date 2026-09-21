"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, ExternalLink, Menu, MoreHorizontal } from "lucide-react";
import type { AuthUser } from "@/types/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { NAV_GROUPS, type NavItem } from "@/components/admin/nav";
import { Topbar } from "@/components/admin/topbar";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
}

function Brand({ collapsed, name }: { collapsed?: boolean; name: string }) {
  return (
    <Link href="/admin" className="flex items-center gap-3 px-2" aria-label={`${name} admin home`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 font-display text-xl leading-none">{name.charAt(0)}</span>
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span className="block font-display text-[22px] uppercase tracking-[0.16em]">{name}</span>
          <span className="block text-[9px] uppercase tracking-[0.3em] text-sidebar-muted">Restaurant OS</span>
        </span>
      )}
    </Link>
  );
}

function NavList({ items, pathname, collapsed, onNavigate }: { items: { label: string; items: NavItem[] }[]; pathname: string; collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
      {items.map((g) => (
        <div key={g.label}>
          {!collapsed && <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-sidebar-muted">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] transition-colors",
                      active ? "bg-sidebar-active text-white" : "text-sidebar-foreground/75 hover:bg-sidebar-active/60 hover:text-white",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && <span className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-[#c9d0b0]" aria-hidden />}
                    <item.icon className="size-[17px] shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ user, restaurantName, alertSound, children }: { user: AuthUser; restaurantName: string; alertSound: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("admin.sidebar") === "collapsed");
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  const groups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => hasPermission(user.permissions, i.perms)) })).filter((g) => g.items.length),
    [user.permissions],
  );
  const flat = groups.flatMap((g) => g.items);
  const bottom = flat.filter((i) => ["/admin", "/admin/orders", "/admin/menu", "/admin/customers"].includes(i.href)).slice(0, 4);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("admin.sidebar", c ? "expanded" : "collapsed");
      return !c;
    });
  };

  return (
    <div className="flex min-h-dvh bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className={cn("no-print sticky top-0 hidden h-dvh shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex", collapsed ? "w-[68px]" : "w-64")}>
        <div className={cn("flex h-[68px] items-center border-b border-sidebar-border", collapsed ? "justify-center" : "px-3")}>
          {collapsed ? <Link href="/admin" className="grid size-9 place-items-center rounded-lg bg-white/10 font-display text-xl">{restaurantName.charAt(0)}</Link> : <Brand name={restaurantName} />}
        </div>
        <NavList items={groups} pathname={pathname} collapsed={collapsed} />
        <div className="space-y-1 border-t border-sidebar-border p-3">
          <a href="/" target="_blank" rel="noreferrer" title="View website" className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-active/60 hover:text-white", collapsed && "justify-center px-0")}>
            <ExternalLink className="size-4 shrink-0" />
            {!collapsed && "View website"}
          </a>
          <button onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-active/60 hover:text-white", collapsed && "justify-center px-0")}>
            {collapsed ? <ChevronsRight className="size-4 rtl:rotate-180" /> : <ChevronsLeft className="size-4 rtl:rotate-180" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" width="max-w-[18rem]" className="bg-sidebar text-sidebar-foreground border-sidebar-border" hideClose>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Admin navigation menu</SheetDescription>
          <div className="flex h-[68px] items-center border-b border-sidebar-border px-3"><Brand name={restaurantName} /></div>
          <NavList items={groups} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} alertSound={alertSound} onMenu={() => setMobileOpen(true)} menuButton={<Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></Button>} />
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="no-print pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden" aria-label="Quick navigation">
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {bottom.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")}>
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button onClick={() => setMobileOpen(true)} className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground">
              <MoreHorizontal className="size-5" />
              More
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
