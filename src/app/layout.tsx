import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeScript } from "@/components/theme-script";

export const metadata: Metadata = {
  title: { default: "Lumière — Kitchen & Wine", template: "%s · Lumière" },
  description: "Seasonal Levantine dining in Amman. Order online for delivery or pickup.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe7" },
    { media: "(prefers-color-scheme: dark)", color: "#12100c" },
  ],
};

// To add Arabic/RTL: set `lang="ar" dir="rtl"` from the restaurant locale and add an Arabic font.
// All layout uses logical properties (ms-, me-, ps-, pe-, text-start) so it mirrors automatically.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
