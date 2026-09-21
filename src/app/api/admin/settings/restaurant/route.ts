import { apiRoute } from "@/lib/api/handler";
import { restaurantProfileSchema } from "@/lib/validation/admin";
import { updateRestaurantProfile } from "@/services/restaurant.service";

export const PUT = apiRoute({ permission: "settings:manage", body: restaurantProfileSchema }, async ({ body, user, audit }) => {
  const r = await updateRestaurantProfile(body);
  await audit({ action: "settings.restaurant_updated", entity: "Restaurant", entityId: r.id, summary: `${user.name} updated the restaurant profile.` });
  return r;
});
