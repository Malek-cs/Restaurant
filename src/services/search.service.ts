import "server-only";
import { db } from "@/database/client";
import { hasPermission } from "@/lib/auth/permissions";
import type { AuthUser } from "@/types/auth";

export interface SearchHit {
  type: "order" | "customer" | "product";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/** Permission-aware quick search for the admin top bar. */
export async function globalSearch(q: string, user: AuthUser): Promise<SearchHit[]> {
  const term = q.trim().replace(/^#/, "");
  if (term.length < 2) return [];
  const hits: SearchHit[] = [];
  const p = user.permissions;

  const tasks: Promise<void>[] = [];
  if (hasPermission(p, ["orders:view", "orders:manage"])) {
    tasks.push(
      db.order
        .findMany({
          where: {
            OR: [
              ...(/^\d{1,9}$/.test(term) ? [{ number: Number(term) }] : []),
              { customer: { name: { contains: term, mode: "insensitive" as const } } },
              { customer: { phone: { contains: term.replace(/[\s-]/g, "") } } },
            ],
          },
          orderBy: { placedAt: "desc" },
          take: 5,
          include: { customer: { select: { name: true } } },
        })
        .then((rows) => {
          for (const o of rows) hits.push({ type: "order", id: o.id, title: `Order #${o.number}`, subtitle: `${o.customer.name} · ${o.status.toLowerCase().replace(/_/g, " ")}`, href: `/admin/orders/${o.id}` });
        }),
    );
  }
  if (hasPermission(p, "customers:view")) {
    tasks.push(
      db.customer
        .findMany({
          where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { phone: { contains: term.replace(/[\s-]/g, "") } }, { email: { contains: term, mode: "insensitive" } }] },
          take: 5,
        })
        .then((rows) => {
          for (const c of rows) hits.push({ type: "customer", id: c.id, title: c.name, subtitle: c.phone, href: `/admin/customers/${c.id}` });
        }),
    );
  }
  if (hasPermission(p, ["menu:view", "menu:manage"])) {
    tasks.push(
      db.product
        .findMany({ where: { name: { contains: term, mode: "insensitive" } }, take: 5, include: { category: { select: { name: true } } } })
        .then((rows) => {
          for (const m of rows) hits.push({ type: "product", id: m.id, title: m.name, subtitle: m.category.name, href: `/admin/menu?q=${encodeURIComponent(m.name)}` });
        }),
    );
  }
  await Promise.all(tasks);
  return hits;
}
