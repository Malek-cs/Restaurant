import { apiRoute } from "@/lib/api/handler";
import { notificationSettingsSchema } from "@/lib/validation/admin";
import { saveNotificationSettings } from "@/services/restaurant.service";

export const PUT = apiRoute({ permission: "settings:manage", body: notificationSettingsSchema }, async ({ body, user, audit }) => {
  const s = await saveNotificationSettings(body);
  await audit({ action: "settings.notifications_updated", entity: "Restaurant", summary: `${user.name} updated notification preferences.` });
  return s;
});
