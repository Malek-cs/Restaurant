import "server-only";
import { db } from "@/database/client";
import type { Prisma } from "@/generated/prisma/client";

export interface AuditActor {
  id: string | null;
  name: string;
  ip?: string | null;
}

export interface AuditInput {
  action: string; // e.g. order.status_changed
  entity: string; // Order, Product, …
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

export async function writeAudit(actor: AuditActor, input: AuditInput) {
  try {
    await db.auditLog.create({
      data: {
        userId: actor.id,
        userName: actor.name,
        ip: actor.ip ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary,
        metadata: input.metadata,
      },
    });
  } catch (e) {
    // Auditing must never break the primary action.
    console.error("[audit] failed to write log", e);
  }
}

export async function listAuditLogs(params: { page: number; pageSize: number; q?: string; entity?: string; userId?: string }) {
  const where: Prisma.AuditLogWhereInput = {
    ...(params.entity ? { entity: params.entity } : {}),
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.q
      ? { OR: [{ summary: { contains: params.q, mode: "insensitive" } }, { userName: { contains: params.q, mode: "insensitive" } }] }
      : {}),
  };
  const [total, rows, entities] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true } }),
  ]);
  return { total, rows, entities: entities.map((e) => e.entity).sort() };
}
