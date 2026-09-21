import { z } from "zod";
import { apiRouteWith } from "@/lib/api/handler";
import { templateUpdateSchema } from "@/lib/validation/admin";
import { TEMPLATE_KEYS } from "@/lib/whatsapp/templates";
import { updateTemplate } from "@/services/whatsapp.service";
import { notFound } from "@/lib/api/errors";

const keySchema = z.enum(TEMPLATE_KEYS);

export const PUT = apiRouteWith<{ key: string }>()({ permission: "whatsapp:manage", body: templateUpdateSchema }, async ({ params, body, user, audit }) => {
  const key = keySchema.safeParse(params.key);
  if (!key.success) throw notFound("Template");
  await updateTemplate(key.data, body);
  await audit({ action: "whatsapp.template_updated", entity: "MessageTemplate", entityId: key.data, summary: `${user.name} edited the WhatsApp template "${key.data}".` });
  return { ok: true };
});
