import { z } from "zod";
import { apiRoute } from "@/lib/api/handler";
import { globalSearch } from "@/services/search.service";

export const GET = apiRoute({ authenticated: true, query: z.object({ q: z.string().max(80).default("") }) }, async ({ query, user }) =>
  globalSearch(query.q, user),
);
