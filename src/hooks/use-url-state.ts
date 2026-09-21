"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Keeps list filters (page, search, status, sort…) in the URL so views are
 * shareable, survive refresh and work with the back button.
 */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const state = useMemo(() => {
    const out = { ...defaults } as Record<string, string>;
    for (const k of Object.keys(defaults)) {
      const v = sp.get(k);
      if (v !== null) out[k] = v;
    }
    return out as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const set = useCallback(
    (patch: Partial<Record<keyof T, string | number | null | undefined>>, opts: { resetPage?: boolean } = { resetPage: true }) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === "" || String(v) === defaults[k]) next.delete(k);
        else next.set(k, String(v));
      }
      if (opts.resetPage && !("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sp, pathname, router],
  );

  return [state, set] as const;
}
