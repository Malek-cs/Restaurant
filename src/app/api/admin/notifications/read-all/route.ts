import { apiRoute } from "@/lib/api/handler";
import { markAllRead } from "@/services/notification.service";

export const POST = apiRoute({ permission: "notifications:view" }, async () => ({ count: await markAllRead() }));
