import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/database/client";
import { cached, invalidate } from "@/lib/cache";
import { ApiError } from "@/lib/api/errors";
import type { BusinessSettingsInput, NotificationSettingsInput, RestaurantProfileInput } from "@/lib/validation/admin";
import type { Prisma } from "@/generated/prisma/client";

export interface OpeningHourDTO {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
}

export interface RestaurantDTO {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  story: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  currency: string;
  locale: string;
  timezone: string;
  taxRate: number;
  serviceFeeRate: number;
  minOrderAmount: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  acceptingOrders: boolean;
  hours: OpeningHourDTO[];
}

export async function getRestaurant(): Promise<RestaurantDTO> {
  return cached("restaurant", ["restaurant"], 60_000, async () => {
    const r = await db.restaurant.findFirst({ include: { openingHours: { orderBy: { dayOfWeek: "asc" } } } });
    if (!r) throw new ApiError(500, "NOT_SEEDED", "No restaurant configured. Run `npm run db:seed`.");
    const { openingHours, createdAt: _c, updatedAt: _u, ...rest } = r;
    void _c;
    void _u;
    return {
      ...rest,
      hours: openingHours.map((h) => ({ dayOfWeek: h.dayOfWeek, isClosed: h.isClosed, opensAt: h.opensAt, closesAt: h.closesAt })),
    };
  });
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function isOpenNow(r: Pick<RestaurantDTO, "hours" | "timezone">, now = new Date()) {
  const dow = Number(formatInTimeZone(now, r.timezone, "i")) % 7; // ISO 1..7 (Mon..Sun) → 0..6 with Sunday=0
  const hhmm = formatInTimeZone(now, r.timezone, "HH:mm");
  const today = r.hours.find((h) => h.dayOfWeek === dow);
  if (!today || today.isClosed) return false;
  if (today.closesAt > today.opensAt) return hhmm >= today.opensAt && hhmm < today.closesAt;
  return hhmm >= today.opensAt || hhmm < today.closesAt; // crosses midnight
}

export async function updateRestaurantProfile(input: RestaurantProfileInput) {
  const r = await db.restaurant.findFirstOrThrow();
  const clean = (v: string | null | undefined) => (v ? v : null);
  await db.restaurant.update({
    where: { id: r.id },
    data: {
      name: input.name,
      tagline: clean(input.tagline),
      description: clean(input.description),
      story: clean(input.story),
      logoUrl: clean(input.logoUrl),
      coverImageUrl: clean(input.coverImageUrl),
      phone: clean(input.phone),
      whatsappNumber: clean(input.whatsappNumber),
      email: clean(input.email),
      address: clean(input.address),
      city: clean(input.city),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      instagramUrl: clean(input.instagramUrl),
      facebookUrl: clean(input.facebookUrl),
      tiktokUrl: clean(input.tiktokUrl),
    },
  });
  invalidate("restaurant");
  return getRestaurant();
}

export async function updateBusinessSettings(input: BusinessSettingsInput) {
  const r = await db.restaurant.findFirstOrThrow();
  await db.$transaction([
    db.restaurant.update({
      where: { id: r.id },
      data: {
        currency: input.currency,
        taxRate: input.taxRate,
        serviceFeeRate: input.serviceFeeRate,
        minOrderAmount: input.minOrderAmount,
        deliveryEnabled: input.deliveryEnabled,
        pickupEnabled: input.pickupEnabled,
        acceptingOrders: input.acceptingOrders,
      },
    }),
    ...input.hours.map((h) =>
      db.openingHour.upsert({
        where: { restaurantId_dayOfWeek: { restaurantId: r.id, dayOfWeek: h.dayOfWeek } },
        create: { restaurantId: r.id, ...h },
        update: { isClosed: h.isClosed, opensAt: h.opensAt, closesAt: h.closesAt },
      }),
    ),
  ]);
  invalidate("restaurant");
  return getRestaurant();
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsInput = {
  emailNewOrder: true,
  emailDailySummary: false,
  emailRecipients: "",
  whatsappOnConfirmed: true,
  whatsappOnReady: true,
  whatsappOnOutForDelivery: true,
  whatsappOnCompleted: false,
  alertNewOrderSound: true,
  alertLowStock: true,
};

export async function getNotificationSettings(): Promise<NotificationSettingsInput> {
  const r = await getRestaurant();
  const row = await db.restaurantSetting.findUnique({ where: { restaurantId_key: { restaurantId: r.id, key: "notifications" } } });
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...((row?.value as Partial<NotificationSettingsInput> | undefined) ?? {}) };
}

export async function saveNotificationSettings(input: NotificationSettingsInput) {
  const r = await getRestaurant();
  const value = input as unknown as Prisma.InputJsonValue;
  await db.restaurantSetting.upsert({
    where: { restaurantId_key: { restaurantId: r.id, key: "notifications" } },
    create: { restaurantId: r.id, key: "notifications", value },
    update: { value },
  });
  return input;
}
