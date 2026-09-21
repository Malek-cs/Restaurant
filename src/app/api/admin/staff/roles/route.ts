import { apiRoute } from "@/lib/api/handler";
import { getRoleMatrix } from "@/services/staff.service";

export const GET = apiRoute({ permission: ["staff:view", "staff:manage"] }, async () => getRoleMatrix());
