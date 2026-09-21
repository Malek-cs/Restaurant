/**
 * Single source of truth for RBAC. These definitions are seeded into the
 * Role / Permission / RolePermission tables; at runtime permissions are read
 * from the database so they can be adjusted without a deploy.
 * This file is safe to import from client components (e.g. sidebar filtering).
 */

export const PERMISSION_DEFS = [
  { key: "dashboard:view", group: "Dashboard", description: "View the dashboard overview" },
  { key: "orders:view", group: "Orders", description: "View all orders" },
  { key: "orders:view_assigned", group: "Orders", description: "View only orders assigned to you" },
  { key: "orders:create", group: "Orders", description: "Create orders on behalf of customers" },
  { key: "orders:confirm", group: "Orders", description: "Confirm or reject new orders" },
  { key: "orders:kitchen", group: "Orders", description: "Update preparation status (preparing / ready)" },
  { key: "orders:deliver", group: "Orders", description: "Mark orders out for delivery / completed" },
  { key: "orders:manage", group: "Orders", description: "Full order control incl. cancel and driver assignment" },
  { key: "payments:view", group: "Payments", description: "View payments" },
  { key: "payments:update", group: "Payments", description: "Update payment status and refund" },
  { key: "menu:view", group: "Menu", description: "View menu items" },
  { key: "menu:manage", group: "Menu", description: "Create, edit and delete menu items" },
  { key: "categories:manage", group: "Menu", description: "Manage categories" },
  { key: "customers:view", group: "Customers", description: "View customers" },
  { key: "customers:manage", group: "Customers", description: "Edit customer notes and details" },
  { key: "delivery:view", group: "Delivery", description: "View delivery zones" },
  { key: "delivery:manage", group: "Delivery", description: "Manage delivery zones and fees" },
  { key: "discounts:manage", group: "Promotions", description: "Manage coupons and promotions" },
  { key: "analytics:view", group: "Reports", description: "View analytics and reports" },
  { key: "export:data", group: "Reports", description: "Export data (CSV / Excel / PDF)" },
  { key: "reviews:manage", group: "Reviews", description: "Moderate reviews" },
  { key: "whatsapp:manage", group: "Messaging", description: "Manage WhatsApp templates and send messages" },
  { key: "notifications:view", group: "Notifications", description: "View the notification center" },
  { key: "staff:view", group: "Staff", description: "View staff accounts" },
  { key: "staff:manage", group: "Staff", description: "Create and edit staff accounts" },
  { key: "settings:manage", group: "Settings", description: "Edit restaurant settings" },
  { key: "audit:view", group: "Security", description: "View the audit log" },
] as const;

export type Permission = (typeof PERMISSION_DEFS)[number]["key"];
export const ALL_PERMISSIONS = PERMISSION_DEFS.map((p) => p.key) as Permission[];

export const ROLE_KEYS = ["SUPER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "KITCHEN", "DELIVERY"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export interface RoleDef {
  name: string;
  description: string;
  rank: number;
  permissions: Permission[];
}

export const ROLE_DEFS: Record<RoleKey, RoleDef> = {
  SUPER_ADMIN: {
    name: "Super admin",
    description: "Owner-level access to everything, including other admins.",
    rank: 100,
    permissions: ALL_PERMISSIONS,
  },
  ADMIN: {
    name: "Admin",
    description: "Runs the restaurant day to day. Cannot manage super admins.",
    rank: 80,
    permissions: ALL_PERMISSIONS,
  },
  MANAGER: {
    name: "Manager",
    description: "Orders, menu, customers and reports.",
    rank: 60,
    permissions: [
      "dashboard:view", "orders:view", "orders:create", "orders:confirm", "orders:kitchen", "orders:deliver",
      "orders:manage", "payments:view", "payments:update", "menu:view", "menu:manage", "categories:manage",
      "customers:view", "customers:manage", "delivery:view", "analytics:view", "export:data",
      "reviews:manage", "notifications:view", "whatsapp:manage",
    ],
  },
  CASHIER: {
    name: "Cashier",
    description: "Takes orders, confirms them and handles payments.",
    rank: 40,
    permissions: ["orders:view", "orders:create", "orders:confirm", "payments:view", "payments:update", "menu:view", "notifications:view"],
  },
  KITCHEN: {
    name: "Kitchen",
    description: "Sees incoming orders and updates preparation status.",
    rank: 30,
    permissions: ["orders:view", "orders:kitchen", "menu:view", "notifications:view"],
  },
  DELIVERY: {
    name: "Delivery",
    description: "Sees assigned deliveries and marks them delivered.",
    rank: 20,
    permissions: ["orders:view_assigned", "orders:deliver", "notifications:view"],
  },
};

export function hasPermission(perms: readonly string[] | undefined, needed: Permission | Permission[]): boolean {
  if (!perms) return false;
  const list = Array.isArray(needed) ? needed : [needed];
  return list.some((p) => perms.includes(p));
}
