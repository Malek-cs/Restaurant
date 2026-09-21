import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  UPLOAD_DIR: z.string().default("./storage/uploads"),
  PAYMENT_PROVIDER: z.enum(["none", "sandbox"]).default("none"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

let cached: z.infer<typeof schema> | null = null;

/** Lazily validated so `next build` doesn't need runtime secrets to be present. */
export function env() {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid environment configuration — ${msg}`);
    }
    cached = parsed.data;
  }
  return cached;
}
