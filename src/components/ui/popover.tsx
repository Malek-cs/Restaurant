"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(({ className, align = "end", sideOffset = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn("z-50 w-80 rounded-xl border bg-popover p-0 shadow-xl data-[state=open]:animate-[pop-in_.15s_ease-out]", className)}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";
