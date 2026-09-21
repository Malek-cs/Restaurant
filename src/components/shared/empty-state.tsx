import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: { icon?: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="mb-4 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = "We couldn't load this.", onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="mb-4 grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-5" />
      </span>
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
