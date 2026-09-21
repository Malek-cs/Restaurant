import { apiRoute } from "@/lib/api/handler";
import { dateRangeQuery } from "@/lib/validation/common";
import { getAnalytics } from "@/services/analytics.service";

export const GET = apiRoute({ permission: ["analytics:view", "dashboard:view"], query: dateRangeQuery }, async ({ query }) => getAnalytics(query));
