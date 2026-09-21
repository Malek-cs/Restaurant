import { apiRouteWith } from "@/lib/api/handler";
import { staffUpdateSchema } from "@/lib/validation/admin";
import { deleteStaff, updateStaff } from "@/services/staff.service";

export const PUT = apiRouteWith<{ id: string }>()({ permission: "staff:manage", body: staffUpdateSchema }, async ({ params, body, user, audit }) => {
  const { user: u, previousRole, passwordChanged } = await updateStaff(params.id, body, user);
  const parts = [`${user.name} updated ${u.name}'s account`];
  if (previousRole !== body.roleKey) parts.push(`(role ${previousRole} → ${body.roleKey})`);
  if (passwordChanged) parts.push("and reset their password");
  await audit({ action: "staff.updated", entity: "User", entityId: u.id, summary: parts.join(" ") + "." });
  return { id: u.id };
});

export const DELETE = apiRouteWith<{ id: string }>()({ permission: "staff:manage" }, async ({ params, user, audit }) => {
  const t = await deleteStaff(params.id, user);
  await audit({ action: "staff.deleted", entity: "User", entityId: t.id, summary: `${user.name} deleted the account of ${t.name}.` });
  return { ok: true };
});
