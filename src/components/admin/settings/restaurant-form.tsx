"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { restaurantProfileSchema } from "@/lib/validation/admin";
import { api } from "@/lib/api/client";
import { useApiMutation } from "@/hooks/use-api";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes";
import type { Restaurant } from "@/types/api";
import { Input, Textarea } from "@/components/ui/input";
import { Field, applyServerErrors } from "@/components/shared/field";
import { ImageUpload } from "@/components/shared/image-upload";
import { Section, SaveBar } from "@/components/admin/settings/section";

type Values = z.input<typeof restaurantProfileSchema>;

export function RestaurantForm({ r }: { r: Restaurant }) {
  const defaults: Values = { name: r.name, tagline: r.tagline ?? "", description: r.description ?? "", story: r.story ?? "", logoUrl: r.logoUrl, coverImageUrl: r.coverImageUrl, phone: r.phone ?? "", whatsappNumber: r.whatsappNumber ?? "", email: r.email ?? "", address: r.address ?? "", city: r.city ?? "", latitude: r.latitude, longitude: r.longitude, instagramUrl: r.instagramUrl ?? "", facebookUrl: r.facebookUrl ?? "", tiktokUrl: r.tiktokUrl ?? "" };
  const form = useForm<Values>({ resolver: zodResolver(restaurantProfileSchema), defaultValues: defaults });
  const { register, control, reset, formState: { errors, isDirty } } = form;
  useUnsavedChangesWarning(isDirty);
  const save = useApiMutation((v: Values) => api.put("/api/admin/settings/restaurant", v), { invalidate: ["/api/admin/settings"], success: "Restaurant profile saved.", onSuccess: () => reset(form.getValues()), onError: (e) => applyServerErrors(form, e) });
  const num = (name: "latitude" | "longitude") => register(name, { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) });

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-5" noValidate>
      <Section title="Identity" description="How your restaurant appears on the website.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Restaurant name" htmlFor="r-name" required error={errors.name?.message}><Input id="r-name" aria-invalid={!!errors.name} {...register("name")} /></Field>
          <Field label="Tagline" htmlFor="r-tag" error={errors.tagline?.message} hint="The big headline on the homepage"><Input id="r-tag" {...register("tagline")} /></Field>
        </div>
        <Field label="Short description" htmlFor="r-desc" error={errors.description?.message}><Textarea id="r-desc" rows={2} {...register("description")} /></Field>
        <Field label="Our story" htmlFor="r-story" error={errors.story?.message} hint="Shown in the “Our philosophy” section and on the About page"><Textarea id="r-story" rows={4} {...register("story")} /></Field>
        <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
          <Field label="Logo"><Controller control={control} name="logoUrl" render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} aspect="aspect-square" name="Logo" label="Upload logo" />} /></Field>
          <Field label="Cover image" hint="Homepage hero background. Landscape, at least 1600px wide."><Controller control={control} name="coverImageUrl" render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} aspect="aspect-[16/7]" name="Cover" label="Upload cover image" />} /></Field>
        </div>
      </Section>
      <Section title="Contact & location">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="r-phone" error={errors.phone?.message}><Input id="r-phone" inputMode="tel" {...register("phone")} /></Field>
          <Field label="WhatsApp number" htmlFor="r-wa" error={errors.whatsappNumber?.message} hint="Powers the WhatsApp button on the website"><Input id="r-wa" inputMode="tel" placeholder="+962 79 000 0000" {...register("whatsappNumber")} /></Field>
          <Field label="Email" htmlFor="r-email" error={errors.email?.message}><Input id="r-email" type="email" {...register("email")} /></Field>
          <Field label="City" htmlFor="r-city"><Input id="r-city" {...register("city")} /></Field>
        </div>
        <Field label="Street address" htmlFor="r-addr" error={errors.address?.message}><Input id="r-addr" {...register("address")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude" htmlFor="r-lat" error={errors.latitude?.message} hint="For the map on your website"><Input id="r-lat" type="number" step="any" inputMode="decimal" {...num("latitude")} /></Field>
          <Field label="Longitude" htmlFor="r-lng" error={errors.longitude?.message}><Input id="r-lng" type="number" step="any" inputMode="decimal" {...num("longitude")} /></Field>
        </div>
      </Section>
      <Section title="Social links">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Instagram" htmlFor="r-ig" error={errors.instagramUrl?.message}><Input id="r-ig" type="url" placeholder="https://instagram.com/…" {...register("instagramUrl")} /></Field>
          <Field label="Facebook" htmlFor="r-fb" error={errors.facebookUrl?.message}><Input id="r-fb" type="url" placeholder="https://facebook.com/…" {...register("facebookUrl")} /></Field>
          <Field label="TikTok" htmlFor="r-tt" error={errors.tiktokUrl?.message}><Input id="r-tt" type="url" placeholder="https://tiktok.com/@…" {...register("tiktokUrl")} /></Field>
        </div>
      </Section>
      <SaveBar dirty={isDirty} saving={save.isPending} onReset={() => reset(defaults)} />
    </form>
  );
}
