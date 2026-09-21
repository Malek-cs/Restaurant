"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Ask for a free-text reason; the promise resolves with the reason string. */
  reason?: { label: string; required?: boolean; placeholder?: string };
}

type Result = { confirmed: boolean; reason?: string };
type ConfirmFn = (opts: ConfirmOptions) => Promise<Result>;

const Ctx = createContext<ConfirmFn>(async () => ({ confirmed: false }));

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState("");
  const resolver = useRef<((r: Result) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setReason("");
    setOpts(o);
    return new Promise<Result>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (confirmed: boolean) => {
    resolver.current?.({ confirmed, reason: reason.trim() || undefined });
    resolver.current = null;
    setOpts(null);
  };

  const needsReason = !!opts?.reason?.required && !reason.trim();

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onOpenChange={(o) => !o && close(false)}>
        <DialogContent size="sm" hideClose>
          {opts && (
            <>
              <DialogHeader className="border-b-0 pb-0">
                <div className="flex items-start gap-3">
                  {opts.destructive && (
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                      <AlertTriangle className="size-4" />
                    </span>
                  )}
                  <div className="space-y-1.5">
                    <DialogTitle>{opts.title}</DialogTitle>
                    {opts.description && <DialogDescription>{opts.description}</DialogDescription>}
                  </div>
                </div>
              </DialogHeader>
              {opts.reason && (
                <div className="px-6 pb-2 pt-3">
                  <label className="mb-1.5 block text-[13px] font-medium">{opts.reason.label}</label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={opts.reason.placeholder} autoFocus />
                </div>
              )}
              <DialogFooter className="border-t-0 pt-2">
                <Button variant="outline" onClick={() => close(false)}>
                  {opts.cancelLabel ?? "Cancel"}
                </Button>
                <Button variant={opts.destructive ? "destructive" : "default"} onClick={() => close(true)} disabled={needsReason} autoFocus={!opts.reason}>
                  {opts.confirmLabel ?? "Confirm"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

export const useConfirm = () => useContext(Ctx);
