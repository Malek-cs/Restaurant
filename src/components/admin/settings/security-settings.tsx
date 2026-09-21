"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Laptop, LogOut, ShieldAlert, Smartphone } from "lucide-react";
import type { z } from "zod";
import { changePasswordSchema } from "@/lib/validation/admin";
import { api } from "@/lib/api/client";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, applyServerErrors } from "@/components/shared/field";
import { Section } from "@/components/admin/settings/section";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { timeAgo } from "@/utils/format";

type Values = z.input<typeof changePasswordSchema>;
interface Session { id: string; userAgent: string | null; ip: string | null; createdAt: string; lastSeenAt: string; current: boolean }

function describe(ua: string | null) {
  if (!ua) return { label: "Unknown device", mobile: false };
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return { label: `${browser}${os ? ` on ${os}` : ""}`, mobile: /iPhone|Android/.test(ua) };
}

export function SecuritySettings() {
  const confirm = useConfirm();
  const { dateTime } = useFormat();
  const form = useForm<Values>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const { register, reset, formState: { errors } } = form;
  const change = useApiMutation((v: Values) => api.post("/api/admin/account/password", v), { success: "Password changed. Other devices were signed out.", invalidate: ["/api/admin/account/sessions"], onSuccess: () => reset(), onError: (e) => applyServerErrors(form, e) });
  const sessions = useApiQuery<Session[]>("/api/admin/account/sessions");
  const revoke = useApiMutation((id: string) => api.del(`/api/admin/account/sessions/${id}`), { invalidate: ["/api/admin/account/sessions"], success: "Session signed out." });
  const revokeAll = useApiMutation(() => api.del<{ count: number }>("/api/admin/account/sessions"), { invalidate: ["/api/admin/account/sessions"], success: (r) => `Signed out ${r.count} other session${r.count === 1 ? "" : "s"}.` });

  async function signOutOthers() {
    const r = await confirm({ title: "Sign out everywhere else?", description: "Every other device will need to sign in again.", confirmLabel: "Sign out others", destructive: true });
    if (r.confirmed) revokeAll.mutate();
  }

  const others = sessions.data?.filter((s) => !s.current) ?? [];
  return (
    <div className="space-y-5">
      <Section title="Change password" description="Use at least 10 characters with upper and lower case letters and a number.">
        <form onSubmit={form.handleSubmit((v) => change.mutate(v))} className="max-w-md space-y-4" noValidate>
          <Field label="Current password" htmlFor="pw-cur" error={errors.currentPassword?.message}><Input id="pw-cur" type="password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...register("currentPassword")} /></Field>
          <Field label="New password" htmlFor="pw-new" error={errors.newPassword?.message}><Input id="pw-new" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register("newPassword")} /></Field>
          <Field label="Confirm new password" htmlFor="pw-conf" error={errors.confirmPassword?.message}><Input id="pw-conf" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} /></Field>
          <Button type="submit" loading={change.isPending}>Update password</Button>
        </form>
      </Section>

  

    
    </div>
  );
}
