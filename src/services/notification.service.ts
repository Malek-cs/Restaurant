import "server-only";
import { db } from "@/database/client";
import type { NotificationType } from "@/generated/prisma/client";

export async function createNotification(input: { type: NotificationType; title: string; body?: string; link?: string }) {
  try {
    await db.notification.create({ data: { type: input.type, title: input.title, body: input.body ?? null, link: input.link ?? null } });
  } catch (e) {
    console.error("[notification] failed", e);
  }
}

export async function listNotifications(q: { page: number; pageSize: number; unread?: boolean }) {
  const where = q.unread ? { readAt: null } : {};
  const [total, unread, rows] = await Promise.all([
    db.notification.count({ where }),
    db.notification.count({ where: { readAt: null } }),
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
  ]);
  return { total, unread, rows };
}

export async function markRead(id: string) {
  await db.notification.updateMany({ where: { id, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllRead() {
  const r = await db.notification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
  return r.count;
}
