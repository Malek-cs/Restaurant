import { z } from "zod";
import { isValidPhone } from "@/utils/phone";

export const id = z.string().min(1).max(64);

export const phone = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20, "Enter a valid phone number")
  .refine(isValidPhone, "Enter a valid phone number");

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .nullish()
    .transform((v) => (v ? v : null));

export const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(120);

export const minor = z.number({ error: "Enter an amount" }).int().min(0, "Amount can't be negative").max(1_000_000_000);

export const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), "Include upper and lower case letters and a number");

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  sort: z.string().max(40).optional(),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

export const dateRangeQuery = z.object({
  range: z.enum(["today", "yesterday", "last7", "last30", "thisMonth", "custom"]).default("today"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type Pagination = z.output<typeof pagination>;
export type DateRangeQuery = z.output<typeof dateRangeQuery>;
