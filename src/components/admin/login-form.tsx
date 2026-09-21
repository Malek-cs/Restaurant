"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock } from "lucide-react";
import { loginSchema } from "@/lib/validation/admin";
import { api, ApiClientError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";

type Values = { email: string; password: string };



export function LoginForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(v: Values) {
    setError(null);
    try {
      await api.post("/api/auth/login", v);
      const next = params.get("next");
      router.replace(next && next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Something went wrong. Please try again.");
      form.setValue("password", "");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-[13px] text-destructive">
          <Lock className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="username" autoFocus  aria-invalid={!!errors.email} {...form.register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <div className="relative">
          <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" aria-invalid={!!errors.password} className="pe-10" {...form.register("password")} />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Sign in
      </Button>


    </form>
  );
}
