import { apiRouteWith } from "@/lib/api/handler";
import { categorySchema } from "@/lib/validation/menu";
import { deleteCategory, updateCategory } from "@/services/menu.service";

export const PUT = apiRouteWith<{ id: string }>()({ permission: "categories:manage", body: categorySchema }, async ({ params, body, user, audit }) => {
  const c = await updateCategory(params.id, body);
  await audit({ action: "category.updated", entity: "Category", entityId: c.id, summary: `${user.name} updated category "${c.name}".` });
  return c;
});

export const DELETE = apiRouteWith<{ id: string }>()({ permission: "categories:manage" }, async ({ params, user, audit }) => {
  const c = await deleteCategory(params.id);
  await audit({ action: "category.deleted", entity: "Category", entityId: c.id, summary: `${user.name} deleted category "${c.name}".` });
  return { ok: true };
});
