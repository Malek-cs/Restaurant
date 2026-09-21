"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { size?: "sm" | "md" | "lg" | "xl"; hideClose?: boolean }
>(({ className, children, size = "md", hideClose, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-[overlay-in_.18s_ease-out]" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border bg-popover shadow-2xl focus:outline-none data-[state=open]:animate-[dialog-in_.2s_cubic-bezier(.2,.7,.2,1)]",
        { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size],
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
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1 border-b px-6 py-4 pe-12", className)} {...props} />
);
export const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("scrollbar-thin flex-1 overflow-y-auto px-6 py-5", className)} {...props} />
);
export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end", className)} {...props} />
);
export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-base font-semibold", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";
export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-[13px] text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";
