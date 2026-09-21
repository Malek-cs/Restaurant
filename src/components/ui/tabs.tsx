"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn("no-scrollbar flex gap-1 overflow-x-auto border-b", className)} {...props} />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "-mb-px whitespace-nowrap border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-6 focus-visible:outline-none", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
