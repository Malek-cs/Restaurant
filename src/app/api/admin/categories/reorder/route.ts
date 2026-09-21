import { apiRoute } from "@/lib/api/handler";
import { reorderSchema } from "@/lib/validation/menu";
import { reorderCategories } from "@/services/menu.service";

export const POST = apiRoute({ permission: "categories:manage", body: reorderSchema }, async ({ body, user, audit }) => {
  await reorderCategories(body.ids);
  await audit({ action: "category.reordered", entity: "Category", summary: `${user.name} reordered categories.` });
  return { ok: true };
});
