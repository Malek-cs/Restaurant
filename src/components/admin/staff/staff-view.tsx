"use client";

import { Fragment, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Minus, MoreHorizontal, Pencil, Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { staffCreateSchema, staffUpdateSchema } from "@/lib/validation/admin";
import type { z } from "zod";
import { api } from "@/lib/api/client";
import { ROLE_DEFS, ROLE_KEYS, type RoleKey } from "@/lib/auth/permissions";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useFormat } from "@/hooks/use-restaurant";
import type { RoleMatrix, StaffRow } from "@/types/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormSurface } from "@/components/shared/form-surface";
import { Field, applyServerErrors } from "@/components/shared/field";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { initials, timeAgo } from "@/utils/format";

const roleTone: Record<string, Tone> = { SUPER_ADMIN: "violet", ADMIN: "blue", MANAGER: "olive", CASHIER: "amber", KITCHEN: "orange", DELIVERY: "green" };
type Values = z.input<typeof staffCreateSchema> & { password?: string | null };

function StaffForm({ member, me, onClose }: { member: StaffRow | null; me: { id: string; roleKey: string; rank: number }; onClose: () => void }) {
  const assignable = ROLE_KEYS.filter((k) => me.roleKey === "SUPER_ADMIN" || ROLE_DEFS[k].rank < me.rank);
  const isSelf = member?.id === me.id;
  const form = useForm<Values>({
    resolver: zodResolver(member ? staffUpdateSchema : staffCreateSchema) as never,
    defaultValues: { name: member?.name ?? "", email: member?.email ?? "", password: "", roleKey: (member?.roleKey ?? assignable[assignable.length - 1] ?? "CASHIER") as RoleKey, phone: member?.phone ?? "", position: member?.position ?? "", isActive: member?.isActive ?? true },
  });
  const { register, control, formState: { errors, isDirty } } = form;
  const save = useApiMutation((v: Values) => (member ? api.put(`/api/admin/staff/${member.id}`, v) : api.post("/api/admin/staff", v)), {
    invalidate: ["/api/admin/staff"], success: member ? "Team member updated." : "Team member added.", onSuccess: onClose, onError: (e) => applyServerErrors(form, e),
  });
  return (
    <FormSurface open onClose={onClose} title={member ? `Edit ${member.name}` : "Add team member"} description={member ? undefined : "They can sign in straight away with the password you set."} dirty={isDirty} submitting={save.isPending} onSubmit={form.handleSubmit((v) => save.mutate(v))}>
      <div className="space-y-4">
        <Field label="Full name" htmlFor="s-name" required error={errors.name?.message}><Input id="s-name" autoFocus aria-invalid={!!errors.name} {...register("name")} /></Field>
        <Field label="Email" htmlFor="s-email" required error={errors.email?.message}><Input id="s-email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...register("email")} /></Field>
        <Field label={member ? "New password" : "Password"} htmlFor="s-pw" required={!member} error={errors.password?.message} hint={member ? "Leave blank to keep the current password. Changing it signs them out everywhere." : "At least 10 characters with upper and lower case letters and a number."}><Input id="s-pw" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" htmlFor="s-role" error={errors.roleKey?.message}>
            <Select id="s-role" disabled={isSelf} {...register("roleKey")}>{(isSelf ? ROLE_KEYS.filter((k) => k === member!.roleKey) : assignable).map((k) => <option key={k} value={k}>{ROLE_DEFS[k].name}</option>)}</Select>
          </Field>
          <Field label="Job title" htmlFor="s-pos"><Input id="s-pos" placeholder="e.g. Head chef" {...register("position")} /></Field>
        </div>
        <Field label="Phone" htmlFor="s-phone" error={errors.phone?.message}><Input id="s-phone" inputMode="tel" {...register("phone")} /></Field>
        <Controller control={control} name="roleKey" render={({ field }) => <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">{ROLE_DEFS[field.value as RoleKey]?.name}: </span>{ROLE_DEFS[field.value as RoleKey]?.description}</p>} />
        <Controller control={control} name="isActive" render={({ field }) => <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5"><span><span className="block text-[13px] font-medium">Account active</span><span className="block text-xs text-muted-foreground">Deactivated staff can't sign in.</span></span><Switch checked={field.value} disabled={isSelf} onCheckedChange={field.onChange} aria-label="Account active" /></label>} />
      </div>
    </FormSurface>
  );
}

function RolesTab() {
  const { data, isLoading } = useApiQuery<RoleMatrix>("/api/admin/staff/roles");
  if (isLoading || !data) return <Skeleton className="h-96" />;
  const groups = [...new Set(data.permissions.map((p) => p.group))];
  return (
    <Card>
      <Table>
        <THead><TR className="hover:bg-transparent"><TH className="min-w-56">Permission</TH>{data.roles.map((r) => <TH key={r.key} className="text-center">{r.name}</TH>)}</TR></THead>
        <TBody>
          {groups.map((g) => (
            <Fragment key={g}>
              <TR className="bg-muted/40 hover:bg-muted/40"><TD colSpan={data.roles.length + 1} className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</TD></TR>
              {data.permissions.filter((p) => p.group === g).map((p) => (
                <TR key={p.key}>
                  <TD><p className="text-[13px]">{p.description}</p><code className="text-[11px] text-muted-foreground">{p.key}</code></TD>
                  {data.roles.map((r) => <TD key={r.key} className="text-center">{r.permissions.includes(p.key) ? <Check className="mx-auto size-4 text-[var(--tone-green-fg)]" aria-label="Allowed" /> : <Minus className="mx-auto size-4 text-muted-foreground/40" aria-label="Not allowed" />}</TD>)}
                </TR>
              ))}
            </Fragment>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

export function StaffView({ canManage, me }: { canManage: boolean; me: { id: string; roleKey: string; rank: number } }) {
  const confirm = useConfirm();
  const { date } = useFormat();
  const [editing, setEditing] = useState<StaffRow | "new" | null>(null);
  const { data, isLoading, error, refetch } = useApiQuery<StaffRow[]>("/api/admin/staff");
  const inv = ["/api/admin/staff"];
  const toggle = useApiMutation((m: StaffRow) => api.put(`/api/admin/staff/${m.id}`, { name: m.name, email: m.email, roleKey: m.roleKey, phone: m.phone ?? "", position: m.position ?? "", isActive: !m.isActive, password: "" }), { invalidate: inv, success: (_, m) => (m.isActive ? `${m.name} deactivated.` : `${m.name} reactivated.`) });
  const remove = useApiMutation((id: string) => api.del(`/api/admin/staff/${id}`), { invalidate: inv, success: "Team member deleted." });

  const editable = (m: StaffRow) => canManage && (me.roleKey === "SUPER_ADMIN" || m.rank < me.rank || m.id === me.id);

  async function onDelete(m: StaffRow) {
    const r = await confirm({ title: `Delete ${m.name}?`, description: "They lose access immediately. Their past actions stay in the audit log. Consider deactivating instead.", confirmLabel: "Delete account", destructive: true });
    if (r.confirmed) remove.mutate(m.id);
  }

  const columns: Column<StaffRow>[] = [
    { key: "name", header: "Team member", mobile: "title", cell: (m) => <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{initials(m.name)}</span><div className="min-w-0"><p className="truncate font-medium">{m.name}{m.id === me.id && <span className="ms-1.5 text-xs font-normal text-muted-foreground">(you)</span>}</p><p className="truncate text-xs text-muted-foreground">{m.email}</p></div></div> },
    { key: "role", header: "Role", cell: (m) => <Badge tone={roleTone[m.roleKey]}>{m.roleName}</Badge> },
    { key: "pos", header: "Title", className: "hidden xl:table-cell", cell: (m) => <span className="text-muted-foreground">{m.position ?? "—"}</span> },
    { key: "status", header: "Status", cell: (m) => <Badge tone={m.isActive ? "green" : "gray"} dot>{m.isActive ? "Active" : "Deactivated"}</Badge> },
    { key: "login", header: "Last sign-in", cell: (m) => (m.lastLoginAt ? timeAgo(m.lastLoginAt) : "Never") },
    { key: "joined", header: "Added", className: "hidden xl:table-cell", mobile: "hide", cell: (m) => date(m.createdAt) },
    ...(canManage ? [{ key: "actions", header: <span className="sr-only">Actions</span>, align: "end" as const, mobile: "action" as const, cell: (m: StaffRow) => editable(m) ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${m.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setEditing(m)}><Pencil /> Edit</DropdownMenuItem>
          {m.id !== me.id && <DropdownMenuItem onSelect={() => toggle.mutate(m)}><ShieldCheck /> {m.isActive ? "Deactivate" : "Reactivate"}</DropdownMenuItem>}
          {m.id !== me.id && <><DropdownMenuSeparator /><DropdownMenuItem destructive onSelect={() => onDelete(m)}><Trash2 /> Delete</DropdownMenuItem></>}
        </DropdownMenuContent>
      </DropdownMenu>) : null }] : []),
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Staff" description="Who can sign in, and what they can do." actions={canManage && <Button onClick={() => setEditing("new")}><Plus /> Add team member</Button>} />
      <Tabs defaultValue="team">
        <TabsList><TabsTrigger value="team">Team</TabsTrigger><TabsTrigger value="roles">Roles &amp; permissions</TabsTrigger></TabsList>
        <TabsContent value="team"><Card><DataTable columns={columns} rows={data} rowKey={(m) => m.id} loading={isLoading} error={error?.message} onRetry={() => refetch()} empty={{ icon: UserCog, title: "No team members" }} /></Card></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
      </Tabs>
      {editing && <StaffForm key={editing === "new" ? "new" : editing.id} member={editing === "new" ? null : editing} me={me} onClose={() => setEditing(null)} />}
    </div>
  );
}
