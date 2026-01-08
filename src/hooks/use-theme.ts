"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "app-theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null);
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      applyTheme(stored);
    } else {
      // Default to light; you could read system preference if desired
      applyTheme("light");
    }
  }, []);

  const applyTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    if (next === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  const setLight = useCallback(() => {
    setTheme("light");
    applyTheme("light");
  }, [applyTheme]);

  const setDark = useCallback(() => {
    setTheme("dark");
    applyTheme("dark");
  }, [applyTheme]);

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setLight,
    setDark,
  };
}