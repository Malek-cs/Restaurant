import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, forbidden, tooMany } from "./errors";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { limiter } from "@/lib/rate-limit";
import { writeAudit, type AuditInput } from "@/services/audit.service";
import type { AuthUser } from "@/types/auth";

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

interface Opts<BS extends z.ZodType, QS extends z.ZodType> {
  /** Any-of permission list. Omit + set `public` for unauthenticated endpoints. */
  permission?: Permission | Permission[];
  /** Require just a signed-in user, no specific permission. */
  authenticated?: boolean;
  public?: boolean;
  body?: BS;
  query?: QS;
  rateLimit?: { key: string; limit: number; windowMs: number };
}

export interface HandlerCtx<P, B, Q> {
  req: NextRequest;
  params: P;
  user: AuthUser;
  body: B;
  query: Q;
  ip: string;
  audit: (input: AuditInput) => Promise<void>;
}

export type PublicHandlerCtx<P, B, Q> = Omit<HandlerCtx<P, B, Q>, "user"> & { user: AuthUser | null };

const MAX_BODY_BYTES = 1_000_000;

function isPrismaError(e: unknown): e is { code: string; meta?: { target?: string[]; field_name?: string } } {
  return !!e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string" && /^P\d{4}$/.test((e as { code: string }).code);
}

export function toErrorResponse(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: { code: e.code, message: e.message, fields: e.fields } }, { status: e.status });
  }
  if (e instanceof z.ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of e.issues) {
      const path = issue.path.join(".") || "_";
      fields[path] ??= issue.message;
    }
    const first = e.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: first ? `${first.path.join(".") || "Request"}: ${first.message}` : "Invalid request", fields } },
      { status: 422 },
    );
  }
  if (isPrismaError(e)) {
    if (e.code === "P2002") {
      const target = e.meta?.target?.join(", ") ?? "value";
      return NextResponse.json({ error: { code: "CONFLICT", message: `That ${target} is already in use.`, fields: {} } }, { status: 409 });
    }
    if (e.code === "P2025") return NextResponse.json({ error: { code: "NOT_FOUND", message: "Record not found." } }, { status: 404 });
    if (e.code === "P2003") {
      return NextResponse.json({ error: { code: "CONFLICT", message: "This record is still referenced by other data." } }, { status: 409 });
    }
  }
  console.error("[api] unhandled error", e);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." } }, { status: 500 });
}

function assertSameOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw forbidden("Cross-origin requests are not allowed.");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw forbidden("Invalid origin.");
  }
}

async function parseBody(req: NextRequest, schema: z.ZodType | undefined) {
  if (!schema) return undefined;
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }
  return schema.parse(json);
}

/** Wraps a route handler with auth, permission checks, validation, rate limiting and error mapping. */
export function apiRoute<
  P extends Record<string, string> = Record<string, string>,
  BS extends z.ZodType = z.ZodUndefined,
  QS extends z.ZodType = z.ZodUndefined,
>(opts: Opts<BS, QS>, fn: (ctx: HandlerCtx<P, z.output<BS>, z.output<QS>>) => Promise<unknown>) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }): Promise<Response> => {
    try {
      assertSameOrigin(req);
      const ip = getClientIp(req);

      if (opts.rateLimit) {
        const r = await limiter.hit(`${opts.rateLimit.key}:${ip}`, opts.rateLimit);
        if (!r.ok) throw tooMany(r.retryAfterSec);
      }

      let user: AuthUser | null = null;
      if (!opts.public) {
        user = await getCurrentUser();
        if (!user) throw new ApiError(401, "UNAUTHORIZED", "Your session has expired. Please sign in again.");
        if (opts.permission && !hasPermission(user.permissions, opts.permission)) throw forbidden();
      } else {
        user = await getCurrentUser().catch(() => null);
      }

      const params = (await routeCtx.params) ?? ({} as P);
      const body = (await parseBody(req, opts.body)) as z.output<BS>;
      const query = (opts.query
        ? opts.query.parse(Object.fromEntries(req.nextUrl.searchParams))
        : undefined) as z.output<QS>;

      const audit = async (input: AuditInput) => {
        await writeAudit({ id: user?.id ?? null, name: user?.name ?? "System", ip }, input);
      };

      const result = await fn({ req, params, user: user as AuthUser, body, query, ip, audit });
      if (result instanceof Response) return result;
      return NextResponse.json({ data: result ?? null });
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}


/**
 * Variant for dynamic routes. TypeScript can't partially infer generics, so the
 * params type is supplied first and the body/query schemas are inferred second:
 *   export const PATCH = apiRouteWith<{ id: string }>()({ body: schema }, async ({ params, body }) => …)
 */
export function apiRouteWith<P extends Record<string, string>>() {
  return <BS extends z.ZodType = z.ZodUndefined, QS extends z.ZodType = z.ZodUndefined>(
    opts: Opts<BS, QS>,
    fn: (ctx: HandlerCtx<P, z.output<BS>, z.output<QS>>) => Promise<unknown>,
  ) => apiRoute<P, BS, QS>(opts, fn);
}
