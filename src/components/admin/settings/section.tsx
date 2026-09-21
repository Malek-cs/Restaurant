import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><div><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</div></CardHeader>
      <CardContent className="space-y-4 pt-5">{children}</CardContent>
    </Card>
  );
}

/** Sticky save bar shown when a settings form has unsaved edits. */
export function SaveBar({ dirty, saving, onReset }: { dirty: boolean; saving: boolean; onReset: () => void }) {
  return (
    <div className="sticky bottom-20 z-20 mt-6 flex items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur lg:bottom-4">
      <p className="text-[13px] text-muted-foreground">{dirty ? "You have unsaved changes." : "All changes saved."}</p>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onReset} disabled={!dirty || saving}>Discard</Button>
        <Button type="submit" disabled={!dirty} loading={saving}>Save changes</Button>
      </div>
    </div>
  );
}

export function ToggleRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
      <span><span className="block text-[13.5px] font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
      {children}
    </label>
  );
}
