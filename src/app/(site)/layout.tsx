import { getRestaurant } from "@/services/restaurant.service";
import { RestaurantProvider } from "@/hooks/use-restaurant";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { MobileCartBar } from "@/components/site/mobile-cart-bar";
import { whatsappLink } from "@/utils/phone";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const r = await getRestaurant();
  return (
    <RestaurantProvider value={{ name: r.name, currency: r.currency, timezone: r.timezone, taxRate: r.taxRate }}>
      <div className="site flex min-h-dvh flex-col">
        <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">Skip to content</a>
        <SiteHeader name={r.name} sub={r.city?.split(",")[0] ?? ""} logoUrl={r.logoUrl} />
        <main id="content" className="flex-1">{children}</main>
        <SiteFooter r={r} />
        {r.whatsappNumber && <WhatsAppFab href={whatsappLink(r.whatsappNumber, `Hello ${r.name}!`)} />}
        <MobileCartBar />
      </div>
    </RestaurantProvider>
  );
}
