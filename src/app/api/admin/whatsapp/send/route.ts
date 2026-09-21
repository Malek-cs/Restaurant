import { apiRoute } from "@/lib/api/handler";
import { whatsappSendSchema } from "@/lib/validation/admin";
import { sendManual } from "@/services/whatsapp.service";

export const POST = apiRoute({ permission: "whatsapp:manage", body: whatsappSendSchema }, async ({ body, user, audit }) => {
  const log = await sendManual(body);
  await audit({ action: "whatsapp.message_prepared", entity: "MessageLog", entityId: log.id, summary: `${user.name} prepared a "${body.templateKey}" WhatsApp message to ${log.to}.` });
  return { id: log.id, link: log.link, body: log.body };
});
