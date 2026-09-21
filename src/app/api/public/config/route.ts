import { apiRoute } from "@/lib/api/handler";
import { getPublicZones } from "@/services/delivery.service";
import { getRestaurant, isOpenNow } from "@/services/restaurant.service";
import { getPaymentConfig } from "@/lib/payments";

export const GET = apiRoute({ public: true }, async () => {
  const [r, zones] = await Promise.all([getRestaurant(), getPublicZones()]);
  return {
    currency: r.currency,
    taxRate: r.taxRate,
    deliveryEnabled: r.deliveryEnabled,
    pickupEnabled: r.pickupEnabled,
    acceptingOrders: r.acceptingOrders,
    openNow: isOpenNow(r),
    minOrderAmount: r.minOrderAmount,
    zones,
    payments: getPaymentConfig(),
  };
});
