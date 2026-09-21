import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type RangePreset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "custom";

export interface ResolvedRange {
  preset: RangePreset;
  label: string;
  from: Date; // inclusive instant
  to: Date; // exclusive instant
  prevFrom: Date;
  prevTo: Date;
  bucket: "hour" | "day";
  fromKey: string; // yyyy-MM-dd in restaurant tz
  toKey: string; // inclusive last day
}

export const RANGE_LABELS: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisMonth: "This month",
  custom: "Custom range",
};

export function dayKey(d: Date, tz: string) {
  return formatInTimeZone(d, tz, "yyyy-MM-dd");
}

export function addDaysKey(key: string, n: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function startOfDayInTz(key: string, tz: string) {
  return fromZonedTime(`${key}T00:00:00`, tz);
}

export function resolveRange(
  q: { range: RangePreset; from?: string; to?: string },
  tz: string,
  now = new Date(),
): ResolvedRange {
  const today = dayKey(now, tz);
  let fromKey = today;
  let toKey = today;
  let preset = q.range;

  switch (q.range) {
    case "yesterday":
      fromKey = toKey = addDaysKey(today, -1);
      break;
    case "last7":
      fromKey = addDaysKey(today, -6);
      break;
    case "last30":
      fromKey = addDaysKey(today, -29);
      break;
    case "thisMonth":
      fromKey = `${today.slice(0, 8)}01`;
      break;
    case "custom": {
      if (q.from && q.to) {
        fromKey = q.from <= q.to ? q.from : q.to;
        toKey = q.from <= q.to ? q.to : q.from;
        // cap at 366 days
        const max = addDaysKey(fromKey, 365);
        if (toKey > max) toKey = max;
      } else {
        preset = "today";
      }
      break;
    }
    default:
      break;
  }

  const from = startOfDayInTz(fromKey, tz);
  const to = startOfDayInTz(addDaysKey(toKey, 1), tz);
  const lengthMs = to.getTime() - from.getTime();
  const days = Math.round(lengthMs / 86_400_000);

  return {
    preset,
    label: preset === "custom" ? `${fromKey} → ${toKey}` : RANGE_LABELS[preset],
    from,
    to,
    prevFrom: new Date(from.getTime() - lengthMs),
    prevTo: from,
    bucket: days <= 1 ? "hour" : "day",
    fromKey,
    toKey,
  };
}
