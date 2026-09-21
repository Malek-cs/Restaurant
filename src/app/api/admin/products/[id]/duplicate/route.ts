import { apiRouteWith } from "@/lib/api/handler";
import { duplicateProduct } from "@/services/menu.service";

export const POST = apiRouteWith<{ id: string }>()({ permission: "menu:manage" }, async ({ params, user, audit }) => {
  const p = await duplicateProduct(params.id);
  await audit({ action: "product.duplicated", entity: "Product", entityId: p.id, summary: `${user.name} duplicated a menu item as "${p.name}".` });
  return p;
});
