"use client";

import * as React from "react";
import { DropdownMenu as DM } from "radix-ui";
import { cn } from "@/lib/utils";

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;
export const DropdownMenuGroup = DM.Group;

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DM.Content>>(({ className, sideOffset = 6, align = "end", ...props }, ref) => (
  <DM.Portal>
    <DM.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn("z-50 min-w-[11rem] overflow-hidden rounded-lg border bg-popover p-1 text-sm shadow-lg data-[state=open]:animate-[pop-in_.14s_ease-out]", className)}
      {...props}
    />
  </DM.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DM.Item> & { destructive?: boolean }>(({ className, destructive, ...props }, ref) => (
  <DM.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-[13px] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground",
      destructive && "text-destructive data-[highlighted]:bg-destructive/10 [&_svg]:text-destructive",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuLabel = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />
);
export const DropdownMenuSeparator = ({ className }: { className?: string }) => <DM.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} />;
