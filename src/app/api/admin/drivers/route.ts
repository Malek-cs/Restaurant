import { apiRoute } from "@/lib/api/handler";
import { listDrivers } from "@/services/order.service";

export const GET = apiRoute({ permission: "orders:manage" }, async () => listDrivers());
