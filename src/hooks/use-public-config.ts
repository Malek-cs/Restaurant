"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface PublicConfig {
  currency: string;
  taxRate: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  acceptingOrders: boolean;
  openNow: boolean;
  minOrderAmount: number;
  zones: { id: string; name: string; fee: number; minOrder: number; etaMinutes: number }[];
  payments: { cash: boolean; online: { id: string; label: string } | null };
}

export function usePublicConfig() {
  return useQuery<PublicConfig>({ queryKey: ["public-config"], queryFn: () => api.get<PublicConfig>("/api/public/config"), staleTime: 60_000 });
}
