import { apiRoute } from "@/lib/api/handler";
import { reorderSchema } from "@/lib/validation/menu";
import { reorderProducts } from "@/services/menu.service";

export const POST = apiRoute({ permission: "menu:manage", body: reorderSchema }, async ({ body, user, audit }) => {
  await reorderProducts(body.ids);
  await audit({ action: "product.reordered", entity: "Product", summary: `${user.name} reordered menu items.` });
  return { ok: true };
});
