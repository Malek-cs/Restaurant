"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadFile } from "@/lib/api/client";

export function ExportMenu({ type, params, label = "Export" }: { type: "orders" | "customers" | "payments" | "revenue"; params?: Record<string, string | undefined>; label?: string }) {
  const [busy, setBusy] = useState(false);

  async function run(format: "csv" | "xlsx" | "pdf") {
    setBusy(true);
    try {
      await downloadFile(`/api/admin/export/${type}`, { ...params, format });
      toast.success(`Your ${format.toUpperCase()} export is ready.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Download as</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => run("csv")}><Table2 /> CSV</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("xlsx")}><FileSpreadsheet /> Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("pdf")}><FileText /> PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
