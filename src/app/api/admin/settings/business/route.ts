import { apiRoute } from "@/lib/api/handler";
import { businessSettingsSchema } from "@/lib/validation/admin";
import { updateBusinessSettings } from "@/services/restaurant.service";

export const PUT = apiRoute({ permission: "settings:manage", body: businessSettingsSchema }, async ({ body, user, audit }) => {
  const r = await updateBusinessSettings(body);
  await audit({ action: "settings.business_updated", entity: "Restaurant", entityId: r.id, summary: `${user.name} updated business settings (tax, fees, hours).` });
  return r;
});
