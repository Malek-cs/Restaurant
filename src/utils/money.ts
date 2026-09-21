/**
 * Money is stored as integers in the smallest currency unit
 * (JOD → fils, 1 JOD = 1000 fils; USD → cents, …).
 */
export function currencyDigits(currency: string): number {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function formatMoney(minor: number, currency = "JOD", opts: { compact?: boolean } = {}): string {
  const digits = currencyDigits(currency);
  const value = minor / 10 ** digits;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: opts.compact && Number.isInteger(value) ? 0 : digits,
    maximumFractionDigits: digits,
  })
    .format(value)
    .replace(/\u00a0/g, " ");
}

/** "12.5" → 12500 (for JOD). Returns null for invalid input. */
export function toMinor(input: string | number, currency = "JOD"): number | null {
  const digits = currencyDigits(currency);
  const n = typeof input === "number" ? input : Number(String(input).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 10 ** digits);
}

export function fromMinor(minor: number, currency = "JOD"): number {
  return minor / 10 ** currencyDigits(currency);
}

/** Input-friendly string, e.g. 12500 → "12.500" */
export function minorToInput(minor: number | null | undefined, currency = "JOD"): string {
  if (minor == null) return "";
  return fromMinor(minor, currency).toFixed(currencyDigits(currency));
}
