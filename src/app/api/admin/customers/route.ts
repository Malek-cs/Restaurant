import { apiRoute } from "@/lib/api/handler";
import { customerListQuery } from "@/lib/validation/admin";
import { listCustomers } from "@/services/customer.service";

export const GET = apiRoute({ permission: "customers:view", query: customerListQuery }, async ({ query }) => listCustomers(query));
