"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useApiQuery } from "@/hooks/use-api";
import type { Restaurant } from "@/types/api";
import type { NotificationSettingsInput } from "@/lib/validation/admin";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/empty-state";
import { RestaurantForm } from "@/components/admin/settings/restaurant-form";
import { BusinessForm } from "@/components/admin/settings/business-form";
import { NotificationsForm } from "@/components/admin/settings/notifications-form";
import { SecuritySettings } from "@/components/admin/settings/security-settings";

interface Res { restaurant: Restaurant; notifications: NotificationSettingsInput }

export function SettingsView() {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = sp.get("tab") ?? "restaurant";
  const { data, isLoading, error, refetch } = useApiQuery<Res>("/api/admin/settings");
  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" description="Your restaurant profile, business rules, notifications and account security." />
      <Tabs value={tab} onValueChange={(t) => router.replace(`/admin/settings?tab=${t}`, { scroll: false })}>
        <TabsList>
          <TabsTrigger value="restaurant">Restaurant</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        {error ? <Card className="mt-6"><ErrorState message={error.message} onRetry={() => refetch()} /></Card> : (
          <>
            <TabsContent value="restaurant">{isLoading || !data ? <Skeleton className="h-[540px]" /> : <RestaurantForm r={data.restaurant} />}</TabsContent>
            <TabsContent value="business">{isLoading || !data ? <Skeleton className="h-[540px]" /> : <BusinessForm r={data.restaurant} />}</TabsContent>
            <TabsContent value="notifications">{isLoading || !data ? <Skeleton className="h-96" /> : <NotificationsForm initial={data.notifications} />}</TabsContent>
            <TabsContent value="security"><SecuritySettings /></TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
