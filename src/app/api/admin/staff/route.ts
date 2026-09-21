import { apiRoute } from "@/lib/api/handler";
import { staffCreateSchema } from "@/lib/validation/admin";
import { createStaff, listStaff } from "@/services/staff.service";

export const GET = apiRoute({ permission: ["staff:view", "staff:manage"] }, async () => listStaff());

export const POST = apiRoute({ permission: "staff:manage", body: staffCreateSchema }, async ({ body, user, audit }) => {
  const u = await createStaff(body, user);
  await audit({ action: "staff.created", entity: "User", entityId: u.id, summary: `${user.name} created the ${body.roleKey} account for ${u.name}.` });
  return { id: u.id };
});
