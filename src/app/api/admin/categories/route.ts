import { apiRoute } from "@/lib/api/handler";
import { categorySchema } from "@/lib/validation/menu";
import { createCategory, listCategoriesAdmin } from "@/services/menu.service";

export const GET = apiRoute({ permission: ["menu:view", "menu:manage", "categories:manage"] }, async () => listCategoriesAdmin());

export const POST = apiRoute({ permission: "categories:manage", body: categorySchema }, async ({ body, user, audit }) => {
  const c = await createCategory(body);
  await audit({ action: "category.created", entity: "Category", entityId: c.id, summary: `${user.name} created category "${c.name}".` });
  return c;
});
