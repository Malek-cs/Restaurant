import type { Metadata } from "next";
import { Suspense } from "react";
import { getRestaurant } from "@/services/restaurant.service";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const r = await getRestaurant().catch(() => null);
  const name = r?.name ?? "Restaurant";
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#1b1711] text-white lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "linear-gradient(90deg, rgba(17,12,8,.78), rgba(17,12,8,.35)), linear-gradient(180deg, rgba(0,0,0,.35), transparent 40%, rgba(0,0,0,.5)), url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1800&q=85')" }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div>
            <p className="font-display text-3xl uppercase tracking-[0.17em]">{name}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.38em] text-white/70">Restaurant OS</p>
          </div>
          <div className="max-w-md">
            <p className="font-display text-[54px] font-normal leading-[0.95] tracking-tight">Every order, in one calm place.</p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/75">Live orders, menu, customers and reports for the whole team — from the kitchen pass to the back office.</p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <p className="font-display mb-8 text-2xl uppercase tracking-[0.17em] lg:hidden">{name}</p>
          <h1 className="font-display text-[40px] font-medium leading-none tracking-tight">Welcome back</h1>
          <p className="mt-3 text-sm text-muted-foreground">Sign in to manage {name}.</p>
          <div className="mt-8">
            <Suspense>
              <LoginForm demo={demo} />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
