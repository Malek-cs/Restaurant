import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { firstAllowedHref } from "@/components/admin/nav";

/** Server-component guard: signed in + has any of the required permissions, else redirect. */
export async function guardPage(perms: Permission | Permission[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!hasPermission(user.permissions, perms)) {
    const home = firstAllowedHref(user.permissions);
    redirect(home === "/admin" || home === "" ? "/admin/notifications" : home);
  }
  return user;
}
