"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ChevronRight, CircleDollarSign, LogOut, Moon, PackageCheck, Search, ShieldCheck, ShoppingBag, Star, Sun, TriangleAlert, User2, XCircle, Laptop, Loader2 } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { toast } from "sonner";
import type { AuthUser } from "@/types/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { api } from "@/lib/api/client";
import { useApiQuery, useApiMutation } from "@/hooks/use-api";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { initials, timeAgo } from "@/utils/format";
import { cn } from "@/lib/utils";

const CRUMBS: Record<string, string> = {
  admin: "Dashboard", orders: "Orders", menu: "Menu", categories: "Categories", customers: "Customers", delivery: "Delivery", payments: "Payments",
  discounts: "Discounts", analytics: "Analytics", reviews: "Reviews", whatsapp: "WhatsApp", notifications: "Notifications", staff: "Staff", settings: "Settings", "audit-log": "Audit log", receipt: "Receipt",
};

function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = parts.map((p, i) => ({ href: "/" + parts.slice(0, i + 1).join("/"), label: CRUMBS[p] ?? "Details" }));
  if (crumbs.length <= 1) return <span className="text-sm font-medium">Dashboard</span>;
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm sm:flex">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180" />}
          {i === crumbs.length - 1 ? <span className="truncate font-medium" aria-current="page">{c.label}</span> : <Link href={c.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">{c.label}</Link>}
        </span>
      ))}
    </nav>
  );
}

// ── Global search ─────────────────────────────────────────────
interface Hit { type: "order" | "customer" | "product"; id: string; title: string; subtitle: string; href: string }

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const dq = useDebounce(q.trim(), 250);
  const { data, isFetching } = useApiQuery<Hit[]>("/api/admin/search", { q: dq }, { enabled: dq.length >= 2 });
  const hits = dq.length >= 2 ? (data ?? []) : [];
  const icon = { order: ShoppingBag, customer: User2, product: PackageCheck } as const;

  return (
    <Popover open={open && dq.length >= 2} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search orders, customers, dishes…"
            aria-label="Search"
            className="h-9 bg-muted/60 ps-9"
          />
          {isFetching && <Loader2 className="absolute end-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-1.5" onOpenAutoFocus={(e) => e.preventDefault()}>
        {hits.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">{isFetching ? "Searching…" : `No results for “${dq}”`}</p>
        ) : (
          <ul>
            {hits.map((h) => {
              const Icon = icon[h.type];
              return (
                <li key={h.type + h.id}>
                  <button
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-start transition-colors hover:bg-accent"
                    onClick={() => { setOpen(false); setQ(""); router.push(h.href); }}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{h.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{h.subtitle}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Notifications ─────────────────────────────────────────────
interface NotificationRow { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string }
interface NotificationList { total: number; unread: number; rows: NotificationRow[] }

export const notificationIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  NEW_ORDER: ShoppingBag, PAYMENT_RECEIVED: CircleDollarSign, ORDER_CANCELLED: XCircle, LOW_STOCK: TriangleAlert, NEW_REVIEW: Star, SYSTEM: ShieldCheck,
};

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.13;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t);
      o.stop(t + 0.2);
    });
  } catch {
    /* audio unavailable until user interaction */
  }
}

function NotificationBell({ alertSound }: { alertSound: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useApiQuery<NotificationList>("/api/admin/notifications", { pageSize: 8 }, { refetchInterval: 20_000, refetchIntervalInBackground: false });
  const prevUnread = useRef<number | null>(null);

  useEffect(() => {
    if (!data) return;
    if (prevUnread.current !== null && data.unread > prevUnread.current) {
      const latest = data.rows.find((r) => !r.readAt);
      if (latest) toast(latest.title, { description: latest.body ?? undefined });
      if (alertSound && latest?.type === "NEW_ORDER") beep();
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/orders") });
    }
    prevUnread.current = data.unread;
  }, [data, alertSound, qc]);

  const markAll = useApiMutation(() => api.post("/api/admin/notifications/read-all"), { invalidate: ["/api/admin/notifications"] });

  async function open(n: NotificationRow) {
    if (!n.readAt) await api.post(`/api/admin/notifications/${n.id}/read`).catch(() => {});
    qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/admin/notifications" });
    if (n.link) router.push(n.link);
  }

  const unread = data?.unread ?? 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative">
          <Bell />
          {unread > 0 && <span className="absolute end-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">{unread > 9 ? "9+" : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-1.5rem))]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate()}><Check /> Mark all read</Button>
        </div>
        <ul className="scrollbar-thin max-h-[22rem] overflow-y-auto">
          {(data?.rows ?? []).length === 0 && <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">You're all caught up.</li>}
          {data?.rows.map((n) => {
            const Icon = notificationIcon[n.type] ?? Bell;
            return (
              <li key={n.id}>
                <button onClick={() => open(n)} className={cn("flex w-full items-start gap-3 border-b px-4 py-3 text-start transition-colors last:border-0 hover:bg-accent/60", !n.readAt && "bg-primary/[0.05]")}>
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Icon className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-medium leading-snug">{n.title}</span>
                      {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    </span>
                    {n.body && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.body}</span>}
                    <span className="mt-1 block text-[11px] text-muted-foreground/80">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Link href="/admin/notifications" className="block border-t px-4 py-2.5 text-center text-[13px] font-medium text-primary hover:bg-accent/50">View all notifications</Link>
      </PopoverContent>
    </Popover>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          {mounted && theme === "dark" ? <Moon /> : <Sun />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => setTheme("light")}><Sun /> Light</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("dark")}><Moon /> Dark</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("system")}><Laptop /> System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const signOut = useApiMutation(() => api.post("/api/auth/logout"), { onSuccess: () => { router.replace("/admin/login"); router.refresh(); } });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-0.5 pe-2 transition-colors hover:bg-accent sm:pe-3" aria-label="Account menu">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials(user.name)}</span>
          <span className="hidden text-start leading-tight sm:block">
            <span className="block text-[13px] font-medium">{user.name}</span>
            <span className="block text-[11px] text-muted-foreground">{user.role.name}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel className="pb-2"><span className="block text-[13px] font-medium text-foreground">{user.name}</span><span className="block truncate font-normal">{user.email}</span></DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hasPermission(user.permissions, "settings:manage") && (
          <DropdownMenuItem onSelect={() => router.push("/admin/settings?tab=security")}><ShieldCheck /> Account &amp; security</DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => window.open("/", "_blank")}><Search className="hidden" /> View website</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => signOut.mutate()}><LogOut /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar({ user, alertSound, menuButton }: { user: AuthUser; alertSound: boolean; onMenu: () => void; menuButton: React.ReactNode }) {
  const canNotify = hasPermission(user.permissions, "notifications:view");
  return (
    <header className="no-print sticky top-0 z-30 flex h-[68px] items-center gap-2 border-b bg-background/85 px-3 backdrop-blur sm:gap-3 sm:px-6 lg:px-8">
      {menuButton}
      <div className="hidden min-w-0 lg:block lg:w-56 xl:w-72"><Breadcrumbs /></div>
      <div className="flex flex-1 justify-center lg:justify-start"><GlobalSearch /></div>
      <div className="flex items-center gap-0.5">
        {canNotify && <NotificationBell alertSound={alertSound} />}
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
