import { z } from "zod";
import { apiRoute } from "@/lib/api/handler";
import { pagination } from "@/lib/validation/common";
import { listAuditLogs } from "@/services/audit.service";

const query = pagination.extend({ entity: z.string().max(40).optional(), userId: z.string().max(64).optional() });

export const GET = apiRoute({ permission: "audit:view", query }, async ({ query }) => listAuditLogs(query));
