import { apiRoute } from "@/lib/api/handler";
import { pagination } from "@/lib/validation/common";
import { listMessageLogs } from "@/services/whatsapp.service";

export const GET = apiRoute({ permission: "whatsapp:manage", query: pagination }, async ({ query }) => listMessageLogs(query));
