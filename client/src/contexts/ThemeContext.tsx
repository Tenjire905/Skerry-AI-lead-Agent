import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type ThemeMode = Theme | "system";

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  switchable = false,
}: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme-mode");
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    }
    return defaultTheme;
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (mode === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return mode;
  });

  useEffect(() => {
    if (mode !== "system") {
      setTheme(mode);
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => {
      setTheme(media.matches ? "dark" : "light");
    };
    applySystemTheme();
    media.addEventListener("change", applySystemTheme);
    return () => media.removeEventListener("change", applySystemTheme);
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      localStorage.setItem("theme-mode", mode);
    }
  }, [theme, mode, switchable]);

  const toggleTheme = switchable
    ? () => {
        setMode(prev => {
          if (prev === "light") return "dark";
          if (prev === "dark") return "light";
          return "dark";
        });
      }
    : undefined;

  return (
    <ThemeContext.Provider
      value={{ theme, mode, setMode, toggleTheme, switchable }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
