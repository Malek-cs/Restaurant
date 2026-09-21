import { apiRoute } from "@/lib/api/handler";
import { listTemplates } from "@/services/whatsapp.service";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";

export const GET = apiRoute({ permission: "whatsapp:manage" }, async () => {
  const p = getWhatsAppProvider();
  return { templates: await listTemplates(), provider: { id: p.id, label: p.label, mode: p.mode } };
});
