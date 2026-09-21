import { formatInTimeZone } from "date-fns-tz";
import type { OpeningHourDTO } from "@/services/restaurant.service";

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function to12h(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function todayIndex(tz: string, now = new Date()) {
  return Number(formatInTimeZone(now, tz, "i")) % 7;
}

export function openStatus(hours: OpeningHourDTO[], tz: string, now = new Date()) {
  const dow = todayIndex(tz, now);
  const hhmm = formatInTimeZone(now, tz, "HH:mm");
  const today = hours.find((h) => h.dayOfWeek === dow);
  if (today && !today.isClosed) {
    const crosses = today.closesAt <= today.opensAt;
    const open = crosses ? hhmm >= today.opensAt || hhmm < today.closesAt : hhmm >= today.opensAt && hhmm < today.closesAt;
    if (open) return { open: true, label: `Open now · until ${to12h(today.closesAt)}` };
    if (hhmm < today.opensAt) return { open: false, label: `Closed · opens today at ${to12h(today.opensAt)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const d = hours.find((h) => h.dayOfWeek === (dow + i) % 7);
    if (d && !d.isClosed) return { open: false, label: `Closed · opens ${i === 1 ? "tomorrow" : DAY_LONG[d.dayOfWeek]} at ${to12h(d.opensAt)}` };
  }
  return { open: false, label: "Closed" };
}

/** Groups consecutive days with identical hours: "Tue – Sun". */
export function groupedHours(hours: OpeningHourDTO[]) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows = order.map((d) => hours.find((h) => h.dayOfWeek === d)).filter(Boolean) as OpeningHourDTO[];
  const sig = (h: OpeningHourDTO) => (h.isClosed ? "closed" : `${h.opensAt}-${h.closesAt}`);
  const out: { days: string; value: string; closed: boolean }[] = [];
  for (const h of rows) {
    const last = out[out.length - 1];
    const s = sig(h);
    const label = DAY_SHORT[h.dayOfWeek]!;
    if (last && (last as { sig?: string }).sig === s) {
      last.days = last.days.split(" – ")[0] + " – " + label;
    } else {
      out.push({ days: label, value: h.isClosed ? "Closed" : `${to12h(h.opensAt)} – ${to12h(h.closesAt)}`, closed: h.isClosed, ...({ sig: s } as object) });
    }
  }
  return out;
}
