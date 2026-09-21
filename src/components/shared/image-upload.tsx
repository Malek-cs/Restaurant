"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { cn } from "@/lib/utils";

export function ImageUpload({ value, onChange, label = "Upload image", aspect = "aspect-[4/3]", className, name = "image" }: { value: string | null | undefined; onChange: (url: string | null) => void; label?: string; aspect?: string; className?: string; name?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function upload(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Use a JPEG, PNG or WebP image.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Images must be 5 MB or smaller.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd, credentials: "same-origin" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? "Upload failed");
      onChange(json.data.url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) void upload(f); }}
        className={cn("relative overflow-hidden rounded-lg border border-dashed transition-colors", aspect, drag ? "border-primary bg-primary/5" : "border-input", !value && "bg-muted/40")}
      >
        {value ? (
          <ProductImage src={value} alt={name} className="absolute inset-0" />
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            <ImagePlus className="size-5" />
            <span>{label}</span>
            <span className="text-xs opacity-70">JPEG, PNG or WebP · up to 5 MB</span>
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-[1px]">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      {value && (
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Replace</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}><Trash2 /> Remove</Button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
    </div>
  );
}
