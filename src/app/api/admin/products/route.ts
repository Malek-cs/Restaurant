import { apiRoute } from "@/lib/api/handler";
import { productListQuery, productSchema } from "@/lib/validation/menu";
import { createProduct, listProductsAdmin } from "@/services/menu.service";

export const GET = apiRoute({ permission: ["menu:view", "menu:manage"], query: productListQuery }, async ({ query }) => listProductsAdmin(query));

export const POST = apiRoute({ permission: "menu:manage", body: productSchema }, async ({ body, user, audit }) => {
  const p = await createProduct(body);
  await audit({ action: "product.created", entity: "Product", entityId: p.id, summary: `${user.name} created menu item "${p.name}".` });
  return p;
});
