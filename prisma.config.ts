import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The fallback lets `prisma generate` (postinstall / CI) run before .env exists.
    // Migrations and the app itself always need a real DATABASE_URL.
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/lumiere?schema=public",
  },
});
