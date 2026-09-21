import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicOrder } from "@/services/order.service";
import { getRestaurant } from "@/services/restaurant.service";
import { OrderTracker } from "@/components/site/order-tracker";
import type { PublicOrder } from "@/types/api";

export const metadata: Metadata = { title: "Track your order", robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, r] = await Promise.all([getPublicOrder(id), getRestaurant()]);
  if (!order) notFound();
  // Dates become strings across the server/client boundary.
  const initial = JSON.parse(JSON.stringify(order)) as PublicOrder;
  return (
    <div className="px-[22px] pb-24 pt-12 md:px-[7vw]">
      <div className="mx-auto max-w-[1000px]">
        <OrderTracker initial={initial} contact={{ phone: r.phone, whatsapp: r.whatsappNumber, name: r.name }} />
      </div>
    </div>
  );
}
