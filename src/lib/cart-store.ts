"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartOption {
  id: string;
  name: string;
  type: "SIZE" | "ADDON";
  priceDelta: number;
}

export interface CartLine {
  key: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  /** Display price only. The server always re-prices the cart. */
  unitPrice: number;
  quantity: number;
  options: CartOption[];
  notes?: string;
}

interface CartState {
  lines: CartLine[];
  orderType: "DELIVERY" | "PICKUP";
  zoneId: string;
  couponCode: string;
  add: (line: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  setNotes: (key: string, notes: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  setOrderType: (t: "DELIVERY" | "PICKUP") => void;
  setZone: (id: string) => void;
  setCoupon: (code: string) => void;
}

export const lineKey = (productId: string, optionIds: string[], notes?: string) =>
  [productId, [...optionIds].sort().join("+"), (notes ?? "").trim().toLowerCase()].join("|");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      orderType: "DELIVERY",
      zoneId: "",
      couponCode: "",
      add: (line) =>
        set((s) => {
          const key = lineKey(line.productId, line.options.map((o) => o.id), line.notes);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) return { lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l)) };
          return { lines: [...s.lines, { ...line, key }] };
        }),
      setQty: (key, qty) => set((s) => ({ lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, qty) } : l)) })),
      setNotes: (key, notes) => set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, notes } : l)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [], couponCode: "" }),
      setOrderType: (orderType) => set({ orderType }),
      setZone: (zoneId) => set({ zoneId }),
      setCoupon: (couponCode) => set({ couponCode }),
    }),
    { name: "lumiere-cart-v1", version: 1, partialize: (s) => ({ lines: s.lines, orderType: s.orderType, zoneId: s.zoneId, couponCode: s.couponCode }) },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotalEstimate = (lines: CartLine[]) => lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
