import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type = "text", ...props }, ref) => (
  <input ref={ref} type={type} className={cn(base, "h-9", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-[84px] py-2 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(base, "h-9 appearance-none pe-9", className)}
      {...props}
    >
      {children}
    </select>
    <svg className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
));
Select.displayName = "Select";
