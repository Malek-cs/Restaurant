import { guardPage } from "@/lib/auth/page-guard";
import { DashboardView } from "@/components/admin/dashboard/dashboard-view";
import { hasPermission } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  const user = await guardPage("dashboard:view");
  return (
    <DashboardView
      userName={user.name.split(" ")[0]!}
      actions={{
        order: hasPermission(user.permissions, "orders:create"),
        product: hasPermission(user.permissions, "menu:manage"),
        coupon: hasPermission(user.permissions, "discounts:manage"),
      }}
    />
  );
}
