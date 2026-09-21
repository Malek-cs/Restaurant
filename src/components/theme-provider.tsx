"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "theme";

interface Ctx {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeCtx = createContext<Ctx>({ theme: "system", resolvedTheme: "light", setTheme: () => {} });

const systemPref = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/**
 * Minimal theme provider (light / dark / system) that toggles the `dark` class on <html>.
 * The no-flash script lives in <ThemeScript /> in the root layout (a server component), which
 * avoids React 19's "script tag inside a client component" warning that next-themes triggers.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  const apply = useCallback((t: Theme) => {
    const r = t === "system" ? systemPref() : t;
    document.documentElement.classList.toggle("dark", r === "dark");
    document.documentElement.style.colorScheme = r;
    setResolved(r);
  }, []);

  useEffect(() => {
    let saved: Theme = "system";
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "light" || v === "dark" || v === "system") saved = v;
    } catch {}
    setThemeState(saved);
    apply(saved);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply((localStorage.getItem(STORAGE_KEY) as Theme) || "system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [apply]);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch {}
      apply(t);
    },
    [apply],
  );

  const value = useMemo(() => ({ theme, resolvedTheme: resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
