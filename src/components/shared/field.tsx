import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { FieldValues, UseFormReturn, Path } from "react-hook-form";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api/client";

export function Field({ label, htmlFor, error, hint, required, className, children }: { label?: string; htmlFor?: string; error?: string; hint?: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ms-0.5 text-destructive" aria-hidden>*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Maps API validation errors onto react-hook-form fields; falls back to a toast. */
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, err: ApiClientError): boolean {
  if (err.fields && Object.keys(err.fields).length) {
    let mapped = 0;
    for (const [path, message] of Object.entries(err.fields)) {
      if (path === "_") continue;
      form.setError(path as Path<T>, { type: "server", message });
      mapped++;
    }
    if (mapped) {
      toast.error(err.message);
      return true;
    }
  }
  return false;
}
