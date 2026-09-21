import { apiRoute } from "@/lib/api/handler";

export const GET = apiRoute({ authenticated: true }, async ({ user }) => user);
