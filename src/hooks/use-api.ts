"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiClientError } from "@/lib/api/client";

type Params = Record<string, string | number | boolean | undefined | null>;

/** GET helper. The query key is [url, params] so invalidating by URL prefix refreshes every variant. */
export function useApiQuery<T>(url: string, params?: Params, options?: Omit<UseQueryOptions<T, ApiClientError, T, QueryKey>, "queryKey" | "queryFn">) {
  return useQuery<T, ApiClientError, T, QueryKey>({
    queryKey: [url, params ?? {}],
    queryFn: ({ signal }) => api.get<T>(url, params, signal),
    ...options,
  });
}

interface MutationOptions<TData, TVars> {
  success?: string | ((data: TData, vars: TVars) => string | null);
  /** Query URL prefixes to invalidate after success, e.g. ["/api/admin/orders"] */
  invalidate?: string[];
  onSuccess?: (data: TData, vars: TVars) => void;
  /** Return true if you've handled the error (e.g. mapped it onto form fields). */
  onError?: (err: ApiClientError, vars: TVars) => boolean | void;
}

export function useApiMutation<TVars = void, TData = unknown>(fn: (vars: TVars) => Promise<TData>, opts: MutationOptions<TData, TVars> = {}) {
  const qc = useQueryClient();
  return useMutation<TData, ApiClientError, TVars>({
    mutationFn: fn,
    onSuccess: async (data, vars) => {
      if (opts.invalidate?.length) {
        await qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && opts.invalidate!.some((p) => (q.queryKey[0] as string).startsWith(p)) });
      }
      const msg = typeof opts.success === "function" ? opts.success(data, vars) : opts.success;
      if (msg) toast.success(msg);
      opts.onSuccess?.(data, vars);
    },
    onError: (err, vars) => {
      const handled = opts.onError?.(err, vars);
      if (!handled) toast.error(err.message || "Something went wrong.");
    },
  });
}
