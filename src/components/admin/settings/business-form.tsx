"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { businessSettingsSchema } from "@/lib/validation/admin";
import { api } from "@/lib/api/client";
import { useApiMutation } from "@/hooks/use-api";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes";
import type { Restaurant } from "@/types/api";
import { DAY_NAMES } from "@/lib/day-names";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, applyServerErrors } from "@/components/shared/field";
import { MoneyInput } from "@/components/shared/money-input";
import { Section, SaveBar, ToggleRow } from "@/components/admin/settings/section";

type Values = z.input<typeof businessSettingsSchema>;
const CURRENCIES = ["JOD", "USD", "EUR", "AED", "SAR", "KWD", "QAR", "EGP"] as const;

export function BusinessForm({ r }: { r: Restaurant }) {
  const hours = Array.from({ length: 7 }, (_, d) => r.hours.find((h) => h.dayOfWeek === d) ?? { dayOfWeek: d, isClosed: false, opensAt: "12:00", closesAt: "23:00" });
  const defaults: Values = { currency: r.currency as Values["currency"], taxRate: r.taxRate, serviceFeeRate: r.serviceFeeRate, minOrderAmount: r.minOrderAmount, deliveryEnabled: r.deliveryEnabled, pickupEnabled: r.pickupEnabled, acceptingOrders: r.acceptingOrders, hours };
  const form = useForm<Values>({ resolver: zodResolver(businessSettingsSchema), defaultValues: defaults });
  const { register, control, watch, reset, formState: { errors, isDirty } } = form;
  useUnsavedChangesWarning(isDirty);
  const save = useApiMutation((v: Values) => api.put("/api/admin/settings/business", v), { invalidate: ["/api/admin/settings"], success: "Business settings saved.", onSuccess: () => reset(form.getValues()), onError: (e) => applyServerErrors(form, e) });
  const currency = watch("currency");
  // display order Monday-first, Sunday last
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-5" noValidate>
      <Section title="Ordering" description="Turn things on and off without touching the menu.">
        <Controller control={control} name="acceptingOrders" render={({ field }) => <ToggleRow label="Accepting online orders" hint="Turn off to pause the website checkout (e.g. when the kitchen is overwhelmed)."><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Accepting online orders" /></ToggleRow>} />
        <Controller control={control} name="deliveryEnabled" render={({ field }) => <ToggleRow label="Delivery" hint="Zones and fees are managed under Delivery."><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Delivery" /></ToggleRow>} />
        <Controller control={control} name="pickupEnabled" render={({ field }) => <ToggleRow label="Pickup"><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Pickup" /></ToggleRow>} />
      </Section>

      <Section title="Pricing" description="Tax and fees are added on top of menu prices at checkout.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Currency" htmlFor="b-cur" hint={currency !== r.currency ? "Existing prices are not converted." : undefined}><Select id="b-cur" {...register("currency")}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
          <Field label="Sales tax (%)" htmlFor="b-tax" error={errors.taxRate?.message}><Input id="b-tax" type="number" step="0.1" min={0} max={50} inputMode="decimal" className="tabular" {...register("taxRate", { valueAsNumber: true })} /></Field>
          <Field label="Service fee (%)" htmlFor="b-fee" error={errors.serviceFeeRate?.message}><Input id="b-fee" type="number" step="0.1" min={0} max={30} inputMode="decimal" className="tabular" {...register("serviceFeeRate", { valueAsNumber: true })} /></Field>
          <Field label="Minimum order" htmlFor="b-min" error={errors.minOrderAmount?.message}><Controller control={control} name="minOrderAmount" render={({ field }) => <MoneyInput id="b-min" value={field.value} onChange={(v) => field.onChange(v ?? 0)} />} /></Field>
        </div>
      </Section>

      <Section title="Opening hours" description="Shown on the website. Times are in your restaurant's timezone. For hours past midnight, set a closing time earlier than the opening time.">
        <ul className="divide-y rounded-lg border">
          {order.map((d) => {
            const i = hours.findIndex((h) => h.dayOfWeek === d);
            const closed = watch(`hours.${i}.isClosed`);
            return (
              <li key={d} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <span className="w-28 text-[13.5px] font-medium">{DAY_NAMES[d]}</span>
                <Controller control={control} name={`hours.${i}.isClosed`} render={({ field }) => <label className="flex items-center gap-2 text-[13px] text-muted-foreground"><Switch checked={!field.value} onCheckedChange={(open) => field.onChange(!open)} aria-label={`${DAY_NAMES[d]} open`} />{closed ? "Closed" : "Open"}</label>} />
                {!closed && (
                  <div className="ms-auto flex items-center gap-2">
                    <Input type="time" aria-label={`${DAY_NAMES[d]} opens`} className="w-[7.5rem]" {...register(`hours.${i}.opensAt`)} />
                    <span className="text-muted-foreground">to</span>
                    <Input type="time" aria-label={`${DAY_NAMES[d]} closes`} className="w-[7.5rem]" {...register(`hours.${i}.closesAt`)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>
      <SaveBar dirty={isDirty} saving={save.isPending} onReset={() => reset(defaults)} />
    </form>
  );
}
