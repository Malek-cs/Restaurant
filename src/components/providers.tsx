"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/shared/confirm-dialog";
import { ApiClientError } from "@/lib/api/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiClientError && err.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ConfirmProvider>
          {children}
          <Toaster position="bottom-right" closeButton richColors={false} toastOptions={{ classNames: { toast: "!bg-popover !text-foreground !border-border !shadow-lg", description: "!text-muted-foreground" } }} />
        </ConfirmProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
