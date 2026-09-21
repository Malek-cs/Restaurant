"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MessageCircle, PlugZap, Send } from "lucide-react";
import { api } from "@/lib/api/client";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes";
import type { CustomerList, MessageLogList, TemplateRow } from "@/types/api";
import { PLACEHOLDERS, renderTemplate, sampleVars } from "@/lib/whatsapp/templates";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { Field } from "@/components/shared/field";
import { timeAgo } from "@/utils/format";

interface TemplatesRes { templates: TemplateRow[]; provider: { id: string; label: string; mode: "manual" | "automatic" } }

function TemplateEditor({ t }: { t: TemplateRow }) {
  const [body, setBody] = useState(t.body);
  const [active, setActive] = useState(t.isActive);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setBody(t.body); setActive(t.isActive); }, [t.body, t.isActive]);
  const dirty = body !== t.body || active !== t.isActive;
  useUnsavedChangesWarning(dirty);
  const save = useApiMutation(() => api.put(`/api/admin/whatsapp/templates/${t.key}`, { body, isActive: active }), { invalidate: ["/api/admin/whatsapp/templates"], success: `“${t.name}” saved.` });

  function insert(key: string) {
    const el = ref.current;
    const token = `{${key}}`;
    if (!el) return setBody((b) => b + token);
    const s = el.selectionStart ?? body.length;
    const e = el.selectionEnd ?? body.length;
    const next = body.slice(0, s) + token + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); });
  }

  const preview = renderTemplate(body, sampleVars());
  const unknown = [...body.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).filter((k) => !PLACEHOLDERS.some((p) => p.key === k));

  return (
    <Card>
      <CardHeader>
        <div><CardTitle>{t.name}</CardTitle><CardDescription>{t.description}</CardDescription></div>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">{active ? "Active" : "Off"}<Switch checked={active} onCheckedChange={setActive} aria-label={`${t.name} active`} /></label>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <Textarea ref={ref} value={body} onChange={(e) => setBody(e.target.value)} rows={5} aria-label={`${t.name} message`} maxLength={1000} />
          {unknown.length > 0 && <p role="alert" className="text-xs text-[var(--tone-amber-fg)]">Unknown placeholder{unknown.length > 1 ? "s" : ""}: {unknown.map((u) => `{${u}}`).join(", ")} — will be sent as-is.</p>}
          <div className="flex flex-wrap gap-1.5">{PLACEHOLDERS.map((p) => <button key={p.key} type="button" title={p.description} onClick={() => insert(p.key)} className="rounded-full border px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">{`{${p.key}}`}</button>)}</div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
          <div className="rounded-xl bg-[#e7efe1] p-4 dark:bg-[#1e2a1f]"><div className="ms-auto w-fit max-w-full rounded-lg rounded-te-none bg-[#d9fdd3] px-3 py-2 text-[13px] leading-relaxed text-[#111] shadow-sm dark:bg-[#005c4b] dark:text-white"><p className="whitespace-pre-wrap break-words">{preview}</p></div></div>
          <div className="mt-4 flex justify-end gap-2">{dirty && <Button variant="ghost" size="sm" onClick={() => { setBody(t.body); setActive(t.isActive); }}>Reset</Button>}<Button size="sm" disabled={!dirty || body.trim().length < 5} loading={save.isPending} onClick={() => save.mutate()}><Check /> Save</Button></div>
        </div>
      </CardContent>
    </Card>
  );
}

function PromotionTab() {
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const { data, isLoading, error, refetch } = useApiQuery<CustomerList>("/api/admin/customers", { pageSize: 10, q, sort: "orders", dir: "desc" }, { placeholderData: (p) => p });
  const send = useApiMutation((customerId: string) => api.post<{ link: string }>("/api/admin/whatsapp/send", { templateKey: "PROMOTION", customerId, promoCode: code.trim().toUpperCase() }), {
    invalidate: ["/api/admin/whatsapp/logs"], onSuccess: (r) => window.open(r.link, "_blank", "noopener"),
  });
  type Row = CustomerList["rows"][number];
  const columns: Column<Row>[] = [
    { key: "name", header: "Customer", mobile: "title", cell: (c) => <div><p className="font-medium">{c.name}</p><p className="tabular text-xs text-muted-foreground">{c.phone}</p></div> },
    { key: "orders", header: "Orders", align: "end", cell: (c) => <span className="tabular">{c.orders}</span> },
    { key: "last", header: "Last order", cell: (c) => (c.lastOrderAt ? timeAgo(c.lastOrderAt) : "Never") },
    { key: "send", header: <span className="sr-only">Send</span>, align: "end", mobile: "action", cell: (c) => <Button size="sm" variant="outline" loading={send.isPending && send.variables === c.id} onClick={() => { if (!code.trim()) return setCodeError("Enter the promo code to include first"); setCodeError(undefined); send.mutate(c.id); }}><Send /> Send</Button> },
  ];
  return (
    <div className="space-y-4">
      <Card><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Promo code to include" htmlFor="promo" error={codeError} hint="Uses your “Promotional message” template. WhatsApp opens with the message ready to send."><Input id="promo" value={code} onChange={(e) => { setCode(e.target.value); setCodeError(undefined); }} placeholder="WELCOME10" className="uppercase" aria-invalid={!!codeError} /></Field></CardContent></Card>
      <Card>
        <div className="border-b p-3 sm:p-4"><SearchInput value={q} onChange={setQ} placeholder="Find a customer" className="w-full sm:w-72" /></div>
        <DataTable columns={columns} rows={data?.rows} rowKey={(c) => c.id} loading={isLoading} error={error?.message} onRetry={() => refetch()} empty={{ icon: MessageCircle, title: "No customers found" }} />
      </Card>
    </div>
  );
}

function LogTab() {
  const [page, setPage] = useState(1);
  const { dateTime } = useFormat();
  const { data, isLoading, error, refetch } = useApiQuery<MessageLogList>("/api/admin/whatsapp/logs", { page, pageSize: 15 }, { placeholderData: (p) => p });
  type Row = MessageLogList["rows"][number];
  const columns: Column<Row>[] = [
    { key: "when", header: "When", mobile: "title", cell: (r) => <span className="whitespace-nowrap text-[13px]">{dateTime(r.createdAt)}</span> },
    { key: "to", header: "To", cell: (r) => <span className="tabular">{r.to}</span> },
    { key: "tpl", header: "Template", cell: (r) => <Badge tone="gray">{r.templateKey.replaceAll("_", " ").toLowerCase()}</Badge> },
    { key: "order", header: "Order", cell: (r) => (r.order ? `#${r.order.number}` : "—") },
    { key: "status", header: "Status", cell: (r) => <Badge tone={r.status === "SENT" ? "green" : r.status === "FAILED" ? "red" : "amber"} dot>{r.status === "QUEUED" ? "Ready to send" : r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge> },
    { key: "body", header: "Message", className: "max-w-[22rem]", mobile: "hide", cell: (r) => <span className="line-clamp-1 text-muted-foreground">{r.body}</span> },
  ];
  return <Card><DataTable columns={columns} rows={data?.rows} rowKey={(r) => r.id} loading={isLoading} error={error?.message} onRetry={() => refetch()} pagination={data ? { page, pageSize: 15, total: data.total, onPageChange: setPage } : undefined} empty={{ icon: MessageCircle, title: "No messages yet", description: "Messages appear here when orders change status or you send a promotion." }} /></Card>;
}

export function WhatsAppView() {
  const { data, isLoading, error, refetch } = useApiQuery<TemplatesRes>("/api/admin/whatsapp/templates");
  return (
    <div className="animate-fade-in">
      <PageHeader title="WhatsApp" description="Message templates for order updates and promotions." />
      {error ? <Card><ErrorState message={error.message} onRetry={() => refetch()} /></Card> : (
        <>
          <Card className="mb-5">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--tone-green-bg)] text-[var(--tone-green-fg)]"><MessageCircle className="size-5" /></span>
                <div><p className="text-[13.5px] font-medium">{isLoading ? "Loading…" : data?.provider.label}<Badge tone="green" className="ms-2">Connected</Badge></p><p className="mt-1 max-w-xl text-[13px] text-muted-foreground">Messages are prepared for you and open in WhatsApp with one click — nothing is sent automatically, and no third-party account is needed. To automate delivery, connect an official WhatsApp Business API provider (see the README, “WhatsApp integration”).</p></div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-[13px] text-muted-foreground"><PlugZap className="size-4" /> Business API: not connected</div>
            </CardContent>
          </Card>
          <Tabs defaultValue="templates">
            <TabsList><TabsTrigger value="templates">Templates</TabsTrigger><TabsTrigger value="promo">Send a promotion</TabsTrigger><TabsTrigger value="log">Message log</TabsTrigger></TabsList>
            <TabsContent value="templates" className="space-y-4">{isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52" />) : data?.templates.map((t) => <TemplateEditor key={t.key} t={t} />)}</TabsContent>
            <TabsContent value="promo"><PromotionTab /></TabsContent>
            <TabsContent value="log"><LogTab /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
