import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-xl border bg-card text-card-foreground shadow-[0_1px_2px_rgba(30,24,14,0.04)]", className)} {...props} />
);
export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)} {...props} />
);
export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-[15px] font-semibold leading-tight", className)} {...props} />
);
export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("mt-1 text-[13px] text-muted-foreground", className)} {...props} />
);
export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("p-5", className)} {...props} />;
