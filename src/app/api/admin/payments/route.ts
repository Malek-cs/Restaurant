import { apiRoute } from "@/lib/api/handler";
import { paymentListQuery } from "@/lib/validation/admin";
import { listPayments } from "@/services/payment.service";

export const GET = apiRoute({ permission: "payments:view", query: paymentListQuery }, async ({ query }) => listPayments(query));
