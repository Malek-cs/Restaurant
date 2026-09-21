import { apiRoute } from "@/lib/api/handler";
import { getNotificationSettings, getRestaurant } from "@/services/restaurant.service";

export const GET = apiRoute({ permission: "settings:manage" }, async () => {
  const [restaurant, notifications] = await Promise.all([getRestaurant(), getNotificationSettings()]);
  return { restaurant, notifications };
});
