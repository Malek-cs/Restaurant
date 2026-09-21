import { BarChart3, Bell, Bike, CreditCard, LayoutDashboard, MessageCircle, Percent, ScrollText, Settings, ShoppingBag, Star, Tags, UserCog, Users, UtensilsCrossed } from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Any-of permissions that grant access to the page. */
  perms: Permission[];
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operate",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, perms: ["dashboard:view"] },
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag, perms: ["orders:view", "orders:view_assigned", "orders:manage"] },
      { label: "Menu", href: "/admin/menu", icon: UtensilsCrossed, perms: ["menu:view", "menu:manage"] },
      { label: "Categories", href: "/admin/categories", icon: Tags, perms: ["categories:manage"] },
      { label: "Customers", href: "/admin/customers", icon: Users, perms: ["customers:view"] },
      { label: "Delivery", href: "/admin/delivery", icon: Bike, perms: ["delivery:view", "delivery:manage"] },
    ],
  },
  {
    label: "Grow",
    items: [
      { label: "Payments", href: "/admin/payments", icon: CreditCard, perms: ["payments:view"] },
      { label: "Discounts", href: "/admin/discounts", icon: Percent, perms: ["discounts:manage"] },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3, perms: ["analytics:view"] },
      { label: "Reviews", href: "/admin/reviews", icon: Star, perms: ["reviews:manage"] },
      { label: "WhatsApp", href: "/admin/whatsapp", icon: MessageCircle, perms: ["whatsapp:manage"] },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Notifications", href: "/admin/notifications", icon: Bell, perms: ["notifications:view"] },
      { label: "Staff", href: "/admin/staff", icon: UserCog, perms: ["staff:view", "staff:manage"] },
      { label: "Audit log", href: "/admin/audit-log", icon: ScrollText, perms: ["audit:view"] },
      { label: "Settings", href: "/admin/settings", icon: Settings, perms: ["settings:manage"] },
    ],
  },
];

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);

export function firstAllowedHref(perms: readonly string[]): string {
  const hit = ALL_NAV.find((n) => n.perms.some((p) => perms.includes(p)));
  return hit?.href ?? "/admin/notifications";
}
