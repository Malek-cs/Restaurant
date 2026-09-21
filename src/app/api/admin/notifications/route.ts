import { apiRoute } from "@/lib/api/handler";
import { notificationListQuery } from "@/lib/validation/admin";
import { listNotifications } from "@/services/notification.service";

export const GET = apiRoute({ permission: "notifications:view", query: notificationListQuery }, async ({ query }) =>
  listNotifications({ page: query.page, pageSize: query.pageSize, unread: query.unread === "1" }),
);
