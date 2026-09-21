import { apiRouteWith } from "@/lib/api/handler";
import { customerUpdateSchema } from "@/lib/validation/admin";
import { getCustomerProfile, updateCustomer } from "@/services/customer.service";

export const GET = apiRouteWith<{ id: string }>()({ permission: "customers:view" }, async ({ params }) => getCustomerProfile(params.id));

export const PATCH = apiRouteWith<{ id: string }>()({ permission: "customers:manage", body: customerUpdateSchema }, async ({ params, body, user, audit }) => {
  const c = await updateCustomer(params.id, body);
  await audit({ action: "customer.updated", entity: "Customer", entityId: c.id, summary: `${user.name} updated customer ${c.name}.` });
  return c;
});
