"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notificationSettingsSchema, type NotificationSettingsInput } from "@/lib/validation/admin";
import { api } from "@/lib/api/client";
import { useApiMutation } from "@/hooks/use-api";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, applyServerErrors } from "@/components/shared/field";
import { Section, SaveBar, ToggleRow } from "@/components/admin/settings/section";

const ROWS: { name: keyof NotificationSettingsInput; label: string; hint?: string; section: "email" | "whatsapp" | "alerts" }[] = [
  { name: "emailNewOrder", label: "Email me about every new order", hint: "Sent to the recipients below.", section: "email" },
  { name: "emailDailySummary", label: "Daily sales summary", hint: "Not sent yet — needs an email provider (see README).", section: "email" },
  { name: "whatsappOnConfirmed", label: "Order confirmed", section: "whatsapp" },
  { name: "whatsappOnReady", label: "Order ready", section: "whatsapp" },
  { name: "whatsappOnOutForDelivery", label: "Out for delivery", section: "whatsapp" },
  { name: "whatsappOnCompleted", label: "Order completed", section: "whatsapp" },
  { name: "alertNewOrderSound", label: "Play a sound when a new order arrives", hint: "Only while the dashboard is open in a tab.", section: "alerts" },
  { name: "alertLowStock", label: "Low-stock alerts", hint: "Adds a notification when a tracked dish runs low.", section: "alerts" },
];

export function NotificationsForm({ initial }: { initial: NotificationSettingsInput }) {
  const form = useForm<NotificationSettingsInput>({ resolver: zodResolver(notificationSettingsSchema), defaultValues: initial });
  const { register, control, reset, formState: { errors, isDirty } } = form;
  useUnsavedChangesWarning(isDirty);
  const save = useApiMutation((v: NotificationSettingsInput) => api.put("/api/admin/settings/notifications", v), { invalidate: ["/api/admin/settings"], success: "Notification settings saved.", onSuccess: () => reset(form.getValues()), onError: (e) => applyServerErrors(form, e) });
  const group = (s: string) => ROWS.filter((r) => r.section === s).map((r) => (
    <Controller key={r.name} control={control} name={r.name} render={({ field }) => <ToggleRow label={r.label} hint={r.hint}><Switch checked={field.value as boolean} onCheckedChange={field.onChange} aria-label={r.label} /></ToggleRow>} />
  ));
  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-5" noValidate>
      <Section title="Email" description="Email is logged to the server console until you connect a provider (see README).">
        {group("email")}
        <Field label="Recipients" htmlFor="n-rec" error={errors.emailRecipients?.message} hint="Comma-separated email addresses"><Input id="n-rec" placeholder="orders@restaurant.com, manager@restaurant.com" {...register("emailRecipients")} /></Field>
      </Section>
      <Section title="WhatsApp to customers" description="Which order updates prepare a WhatsApp message for the customer. You edit the wording under WhatsApp.">{group("whatsapp")}</Section>
      <Section title="Dashboard alerts">{group("alerts")}</Section>
      <SaveBar dirty={isDirty} saving={save.isPending} onReset={() => reset(initial)} />
    </form>
  );
}
