import { apiRoute } from "@/lib/api/handler";
import { loginSchema } from "@/lib/validation/admin";
import { login } from "@/services/auth.service";
import { limiter } from "@/lib/rate-limit";
import { tooMany } from "@/lib/api/errors";
import { writeAudit } from "@/services/audit.service";

export const POST = apiRoute({ public: true, body: loginSchema, rateLimit: { key: "login", limit: 20, windowMs: 15 * 60_000 } }, async ({ body, ip, req }) => {
  // Additional per-account limiter so one email can't be hammered from many IPs
  const perEmail = await limiter.hit(`login-email:${body.email}`, { limit: 10, windowMs: 15 * 60_000 });
  if (!perEmail.ok) throw tooMany(perEmail.retryAfterSec);
  const user = await login(body, { ip, userAgent: req.headers.get("user-agent") });
  await writeAudit({ id: user.id, name: user.name, ip }, { action: "auth.login", entity: "User", entityId: user.id, summary: `${user.name} signed in.` });
  return { id: user.id, name: user.name, roleKey: user.roleKey };
});
