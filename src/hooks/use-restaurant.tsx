"use client";

import { createContext, useContext, useMemo } from "react";
import { formatMoney } from "@/utils/money";
import { formatDate, formatDateTime, formatTime } from "@/utils/format";

export interface RestaurantContextValue {
  name: string;
  currency: string;
  timezone: string;
  taxRate: number;
}

const Ctx = createContext<RestaurantContextValue>({ name: "Restaurant", currency: "JOD", timezone: "Asia/Amman", taxRate: 16 });

export function RestaurantProvider({ value, children }: { value: RestaurantContextValue; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Currency + timezone aware formatters bound to the current restaurant. */
export function useFormat() {
  const r = useContext(Ctx);
  return useMemo(
    () => ({
      restaurant: r,
      money: (minor: number, opts?: { compact?: boolean }) => formatMoney(minor, r.currency, opts),
      date: (d: Date | string | number) => formatDate(d, r.timezone),
      time: (d: Date | string | number) => formatTime(d, r.timezone),
      dateTime: (d: Date | string | number) => formatDateTime(d, r.timezone),
    }),
    [r],
  );
}
