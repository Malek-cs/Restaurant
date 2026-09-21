import { z } from "zod";
import { apiRouteWith } from "@/lib/api/handler";
import { productSchema } from "@/lib/validation/menu";
import { deleteProduct, getProductAdmin, setProductFlags, updateProduct } from "@/services/menu.service";

export const GET = apiRouteWith<{ id: string }>()({ permission: ["menu:view", "menu:manage"] }, async ({ params }) => getProductAdmin(params.id));

export const PUT = apiRouteWith<{ id: string }>()({ permission: "menu:manage", body: productSchema }, async ({ params, body, user, audit }) => {
  const p = await updateProduct(params.id, body);
  await audit({ action: "product.updated", entity: "Product", entityId: p.id, summary: `${user.name} updated menu item "${p.name}".` });
  return p;
});

const flags = z.object({ isAvailable: z.boolean().optional(), isFeatured: z.boolean().optional(), isPopular: z.boolean().optional() });

export const PATCH = apiRouteWith<{ id: string }>()({ permission: "menu:manage", body: flags }, async ({ params, body, user, audit }) => {
  const p = await setProductFlags(params.id, body);
  const what = Object.entries(body).map(([k, v]) => `${k.replace("is", "").toLowerCase()}=${v}`).join(", ");
  await audit({ action: "product.flags_changed", entity: "Product", entityId: p.id, summary: `${user.name} set ${what} on "${p.name}".` });
  return p;
});

export const DELETE = apiRouteWith<{ id: string }>()({ permission: "menu:manage" }, async ({ params, user, audit }) => {
  const p = await deleteProduct(params.id);
  await audit({ action: "product.deleted", entity: "Product", entityId: p.id, summary: `${user.name} deleted menu item "${p.name}".` });
  return { ok: true };
});
