/**
 * Normalises phone numbers to E.164. Defaults to Jordan (+962) for local numbers
 * such as 0790000000 or 790000000. Numbers that already start with + or 00 are kept.
 */
export function normalizePhone(input: string, defaultCountryCode = "962"): string {
  let s = input.replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("+")) return "+" + s.slice(1).replace(/\D/g, "");
  s = s.replace(/\D/g, "");
  if (s.startsWith(defaultCountryCode)) return "+" + s;
  if (s.startsWith("0")) s = s.slice(1);
  return `+${defaultCountryCode}${s}`;
}

export function isValidPhone(input: string): boolean {
  const n = normalizePhone(input);
  return /^\+\d{9,15}$/.test(n);
}

export function whatsappLink(phone: string, text?: string) {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
