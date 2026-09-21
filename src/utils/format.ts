import { formatInTimeZone } from "date-fns-tz";

export const DEFAULT_TZ = "Asia/Amman";

type DateInput = Date | string | number;

export function formatDate(d: DateInput, tz = DEFAULT_TZ) {
  return formatInTimeZone(new Date(d), tz, "d MMM yyyy");
}
export function formatTime(d: DateInput, tz = DEFAULT_TZ) {
  return formatInTimeZone(new Date(d), tz, "h:mm a");
}
export function formatDateTime(d: DateInput, tz = DEFAULT_TZ) {
  return formatInTimeZone(new Date(d), tz, "d MMM yyyy, h:mm a");
}

export function timeAgo(d: DateInput, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(d);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatPercent(n: number, digits = 1) {
  return `${n.toFixed(digits)}%`;
}

export function titleCase(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
