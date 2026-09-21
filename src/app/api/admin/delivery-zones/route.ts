import { apiRoute } from "@/lib/api/handler";
import { zoneSchema } from "@/lib/validation/admin";
import { createZone, listZones } from "@/services/delivery.service";

export const GET = apiRoute({ permission: ["delivery:view", "delivery:manage"] }, async () => listZones());

export const POST = apiRoute({ permission: "delivery:manage", body: zoneSchema }, async ({ body, user, audit }) => {
  const z = await createZone(body);
  await audit({ action: "zone.created", entity: "DeliveryZone", entityId: z.id, summary: `${user.name} added delivery zone "${z.name}".` });
  return z;
});
