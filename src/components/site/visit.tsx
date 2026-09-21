import { DAY_LONG, to12h, todayIndex } from "@/lib/hours";
import type { RestaurantDTO } from "@/services/restaurant.service";

export function HoursList({ r }: { r: RestaurantDTO }) {
  const today = todayIndex(r.timezone);
  return (
    <ul className="max-w-sm divide-y text-[14px]">
      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
        const h = r.hours.find((x) => x.dayOfWeek === d);
        const isToday = d === today;
        return <li key={d} className={`flex justify-between py-3 ${isToday ? "font-medium" : "font-light opacity-80"}`}><span>{DAY_LONG[d]}{isToday && <span className="ms-2 text-[10px] uppercase tracking-widest text-primary">Today</span>}</span><span className="tabular">{!h || h.isClosed ? "Closed" : `${to12h(h.opensAt)} – ${to12h(h.closesAt)}`}</span></li>;
      })}
    </ul>
  );
}

export function MapEmbed({ r, className }: { r: RestaurantDTO; className?: string }) {
  const src = r.latitude != null && r.longitude != null ? `https://www.google.com/maps?q=${r.latitude},${r.longitude}&z=16&output=embed` : r.address ? `https://www.google.com/maps?q=${encodeURIComponent(`${r.address} ${r.city ?? ""}`)}&z=16&output=embed` : null;
  if (!src) return null;
  return <iframe title={`Map showing ${r.name}`} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className={className ?? "h-full min-h-[360px] w-full border-0"} />;
}

export function directionsUrl(r: RestaurantDTO) {
  return r.latitude != null ? `https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${r.address ?? ""} ${r.city ?? ""}`)}`;
}
