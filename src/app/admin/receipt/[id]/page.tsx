import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { guardPage } from "@/lib/auth/page-guard";
import { getOrder } from "@/services/order.service";
import { getRestaurant } from "@/services/restaurant.service";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/format";
import { AutoPrint } from "@/components/admin/orders/auto-print";
import { STATUS_META } from "@/lib/order-status";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await guardPage(["orders:view", "orders:view_assigned", "orders:manage"]);
  const { id } = await params;
  const [order, r] = await Promise.all([getOrder(id, user).catch(() => null), getRestaurant()]);
  if (!order) notFound();
  const m = (n: number) => formatMoney(n, r.currency);
  const Row = ({ l, v, bold }: { l: string; v: string; bold?: boolean }) => (
    <div className={`flex justify-between gap-4 ${bold ? "font-semibold" : ""}`}><span>{l}</span><span className="tabular-nums">{v}</span></div>
  );
  return (
    <main className="min-h-dvh bg-neutral-100 p-6 print:bg-white print:p-0">
      <AutoPrint />
      <article className="mx-auto w-[80mm] max-w-full bg-white p-5 font-mono text-[12px] leading-relaxed text-black shadow print:shadow-none">
        <header className="text-center">
          <p className="text-base font-bold uppercase tracking-widest">{r.name}</p>
          {r.address && <p>{r.address}</p>}
          {r.phone && <p>{r.phone}</p>}
        </header>
        <hr className="my-3 border-dashed border-black/50" />
        <p className="text-center text-sm font-bold">ORDER #{order.number}</p>
        <p className="text-center">{formatDateTime(order.placedAt, r.timezone)}</p>
        <p className="text-center uppercase">{order.type.replace("_", "-")} · {STATUS_META[order.status].label}</p>
        <hr className="my-3 border-dashed border-black/50" />
        <p>{order.customer.name}</p>
        <p>{order.customer.phone}</p>
        {order.type === "DELIVERY" && (
          <p>{[order.zoneName, order.addressLine, order.building && `Bldg ${order.building}`, order.floor && `Fl ${order.floor}`, order.apartment && `Apt ${order.apartment}`].filter(Boolean).join(", ")}</p>
        )}
        {order.deliveryNotes && <p>Note: {order.deliveryNotes}</p>}
        <hr className="my-3 border-dashed border-black/50" />
        <ul className="space-y-2">
          {order.items.map((i) => (
            <li key={i.id}>
              <Row l={`${i.quantity} × ${i.productName}`} v={m(i.lineTotal)} />
              {i.options.map((o) => <p key={o.id} className="ps-4 text-[11px]">+ {o.name}</p>)}
              {i.notes && <p className="ps-4 text-[11px]">“{i.notes}”</p>}
            </li>
          ))}
        </ul>
        <hr className="my-3 border-dashed border-black/50" />
        <Row l="Subtotal" v={m(order.subtotal)} />
        {order.discountTotal > 0 && <Row l={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} v={`-${m(order.discountTotal)}`} />}
        {order.deliveryFee > 0 && <Row l="Delivery" v={m(order.deliveryFee)} />}
        {order.serviceFee > 0 && <Row l="Service fee" v={m(order.serviceFee)} />}
        <Row l={`Tax (${r.taxRate}%)`} v={m(order.taxTotal)} />
        <hr className="my-2 border-black/50" />
        <Row l="TOTAL" v={m(order.total)} bold />
        <p className="mt-2 uppercase">Payment: {order.payment?.method === "ONLINE" ? "Online" : "Cash"} — {order.payment?.status ?? "—"}</p>
        {order.notes && <p className="mt-2">Notes: {order.notes}</p>}
        <hr className="my-3 border-dashed border-black/50" />
        <p className="text-center">Thank you for dining with us.</p>
      </article>
    </main>
  );
}
