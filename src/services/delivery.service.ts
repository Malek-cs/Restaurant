import "server-only";
import { db } from "@/database/client";
import { cached, invalidate } from "@/lib/cache";
import { notFound } from "@/lib/api/errors";
import type { ZoneInput } from "@/lib/validation/admin";

export async function getPublicZones() {
  return cached("public-zones", ["zones"], 60_000, async () => {
    const zones = await db.deliveryZone.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    return zones.map((z) => ({ id: z.id, name: z.name, fee: z.fee, minOrder: z.minOrder, etaMinutes: z.etaMinutes }));
  });
}

export async function listZones() {
  const zones = await db.deliveryZone.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { orders: true } } },
  });
  return zones.map((z) => ({ ...z, orderCount: z._count.orders, _count: undefined }));
}

export async function createZone(input: ZoneInput) {
  const max = await db.deliveryZone.aggregate({ _max: { sortOrder: true } });
  const z = await db.deliveryZone.create({
    data: { ...input, description: input.description || null, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  invalidate("zones");
  return z;
}

export async function updateZone(id: string, input: ZoneInput) {
  const exists = await db.deliveryZone.findUnique({ where: { id } });
  if (!exists) throw notFound("Delivery zone");
  const z = await db.deliveryZone.update({ where: { id }, data: { ...input, description: input.description || null } });
  invalidate("zones");
  return z;
}

export async function deleteZone(id: string) {
  const z = await db.deliveryZone.findUnique({ where: { id } });
  if (!z) throw notFound("Delivery zone");
  // Orders keep zoneName as a snapshot (zoneId is set null on delete).
  await db.deliveryZone.delete({ where: { id } });
  invalidate("zones");
  return z;
}
