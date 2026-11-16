import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const LS = "hs-theme";

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // null = seguir el tema del sistema
  const [stored, setStored] = useState<Theme | null>(() => {
    try {
      const s = localStorage.getItem(LS);
      return s === "light" || s === "dark" ? s : null;
    } catch {
      return null;
    }
  });
  const [sysDark, setSysDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const h = (e: MediaQueryListEvent) => setSysDark(e.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);

  const theme: Theme = stored ?? (sysDark ? "dark" : "light");

  useEffect(() => {
    const r = document.documentElement;
    if (stored) r.setAttribute("data-theme", stored);
    else r.removeAttribute("data-theme");
  }, [stored]);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setStored(next);
    try {
      localStorage.setItem(LS, next);
    } catch {
      /* sin almacenamiento */
    }
  };

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme fuera de ThemeProvider");
  return c;
}
