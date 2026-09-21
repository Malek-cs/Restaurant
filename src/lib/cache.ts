import "server-only";

/**
 * Tiny tag-invalidated TTL cache for hot public reads (menu, restaurant info).
 * Per-process; replace the store with Redis when scaling horizontally.
 */
interface Entry {
  value: unknown;
  expires: number;
  tags: string[];
}

const g = globalThis as unknown as { __cache?: Map<string, Entry> };
const store = (g.__cache ??= new Map<string, Entry>());

export async function cached<T>(key: string, tags: string[], ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await fn();
  store.set(key, { value, expires: Date.now() + ttlMs, tags });
  return value;
}

export function invalidate(...tags: string[]) {
  for (const [k, e] of store) {
    if (e.tags.some((t) => tags.includes(t))) store.delete(k);
  }
}
