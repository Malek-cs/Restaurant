"use client";

import { useEffect, useState } from "react";

/** True after the first client render. Use it to avoid hydration mismatches for persisted client state (cart). */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
