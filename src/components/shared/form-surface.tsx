"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: "dialog" | "sheet";
  size?: "sm" | "md" | "lg" | "xl";
  sheetWidth?: string;
  dirty?: boolean;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
}

/** Modal or drawer wrapper for forms: consistent header/footer, submit state and a "discard changes?" guard. */
export function FormSurface({ open, onClose, title, description, variant = "dialog", size = "md", sheetWidth, dirty, submitting, submitLabel = "Save", onSubmit, children, footerLeft }: Props) {
  const confirm = useConfirm();
  useUnsavedChangesWarning(!!dirty && open);

  async function requestClose() {
    if (dirty) {
      const r = await confirm({ title: "Discard unsaved changes?", description: "Your edits haven't been saved and will be lost.", confirmLabel: "Discard", cancelLabel: "Keep editing", destructive: true });
      if (!r.confirmed) return;
    }
    onClose();
  }

  const footer = (
    <>
      {footerLeft && <div className="me-auto flex items-center">{footerLeft}</div>}
      <Button type="button" variant="outline" onClick={requestClose}>Cancel</Button>
      <Button type="submit" loading={submitting}>{submitLabel}</Button>
    </>
  );

  if (variant === "sheet") {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && requestClose()}>
        <SheetContent width={sheetWidth ?? "max-w-xl"}>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              {description ? <SheetDescription>{description}</SheetDescription> : <SheetDescription className="sr-only">{title}</SheetDescription>}
            </SheetHeader>
            <SheetBody>{children}</SheetBody>
            <SheetFooter>{footer}</SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
      <DialogContent size={size}>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
          </DialogHeader>
          <DialogBody>{children}</DialogBody>
          <DialogFooter>{footer}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
