import { apiRouteWith } from "@/lib/api/handler";
import { zoneSchema } from "@/lib/validation/admin";
import { deleteZone, updateZone } from "@/services/delivery.service";

export const PUT = apiRouteWith<{ id: string }>()({ permission: "delivery:manage", body: zoneSchema }, async ({ params, body, user, audit }) => {
  const z = await updateZone(params.id, body);
  await audit({ action: "zone.updated", entity: "DeliveryZone", entityId: z.id, summary: `${user.name} updated delivery zone "${z.name}".` });
  return z;
});

export const DELETE = apiRouteWith<{ id: string }>()({ permission: "delivery:manage" }, async ({ params, user, audit }) => {
  const z = await deleteZone(params.id);
  await audit({ action: "zone.deleted", entity: "DeliveryZone", entityId: z.id, summary: `${user.name} deleted delivery zone "${z.name}".` });
  return { ok: true };
});
