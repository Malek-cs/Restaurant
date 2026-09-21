"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="no-print mx-auto mb-4 flex w-[80mm] max-w-full justify-end">
      <Button onClick={() => window.print()} size="sm"><Printer /> Print</Button>
    </div>
  );
}
