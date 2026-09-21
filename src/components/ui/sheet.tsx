"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: "left" | "right"; width?: string; hideClose?: boolean }
>(({ className, children, side = "right", width = "max-w-xl", hideClose, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-[overlay-in_.18s_ease-out]" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 z-50 flex w-full flex-col bg-popover shadow-2xl focus:outline-none",
        side === "right" ? "end-0 border-s data-[state=open]:animate-[sheet-in-right_.26s_cubic-bezier(.2,.7,.2,1)]" : "start-0 border-e data-[state=open]:animate-[sheet-in-left_.26s_cubic-bezier(.2,.7,.2,1)]",
        width,
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close className="absolute end-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Close">
          <X className="size-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1 border-b px-6 py-4 pe-12", className)} {...props} />
);
export const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("scrollbar-thin flex-1 overflow-y-auto px-6 py-5", className)} {...props} />
);
export const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end", className)} {...props} />
);
export const SheetTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-base font-semibold", className)} {...props} />
));
SheetTitle.displayName = "SheetTitle";
export const SheetDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-[13px] text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = "SheetDescription";
