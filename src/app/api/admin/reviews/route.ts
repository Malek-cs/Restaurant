import { apiRoute } from "@/lib/api/handler";
import { reviewListQuery } from "@/lib/validation/admin";
import { listReviews } from "@/services/review.service";

export const GET = apiRoute({ permission: "reviews:manage", query: reviewListQuery }, async ({ query }) => listReviews(query));
