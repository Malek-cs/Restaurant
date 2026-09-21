import "server-only";

/**
 * Rate limiting abstraction. The default implementation is an in-memory sliding
 * window (per server instance). Swap `limiter` for a Redis/Upstash-backed
 * implementation when running multiple instances.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export interface RateLimiter {
  hit(key: string, opts: { limit: number; windowMs: number }): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

class MemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();

  async hit(key: string, { limit, windowMs }: { limit: number; windowMs: number }): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const arr = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    if (arr.length >= limit) {
      this.hits.set(key, arr);
      const retryAfterSec = Math.max(1, Math.ceil((arr[0] + windowMs - now) / 1000));
      return { ok: false, remaining: 0, retryAfterSec };
    }
    arr.push(now);
    this.hits.set(key, arr);
    if (this.hits.size > 5000) this.gc(windowStart);
    return { ok: true, remaining: limit - arr.length, retryAfterSec: 0 };
  }

  async reset(key: string) {
    this.hits.delete(key);
  }

  private gc(windowStart: number) {
    for (const [k, v] of this.hits) {
      if (!v.some((t) => t > windowStart)) this.hits.delete(k);
    }
  }
}

const g = globalThis as unknown as { __limiter?: RateLimiter };
export const limiter: RateLimiter = (g.__limiter ??= new MemoryRateLimiter());
