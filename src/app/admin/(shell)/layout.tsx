import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getNotificationSettings, getRestaurant } from "@/services/restaurant.service";
import { AdminShell } from "@/components/admin/shell";
import { RestaurantProvider } from "@/hooks/use-restaurant";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const [r, settings] = await Promise.all([getRestaurant(), getNotificationSettings()]);
  return (
    <RestaurantProvider value={{ name: r.name, currency: r.currency, timezone: r.timezone, taxRate: r.taxRate }}>
      <AdminShell user={user} restaurantName={r.name} alertSound={settings.alertNewOrderSound}>
        {children}
      </AdminShell>
    </RestaurantProvider>
  );
}
