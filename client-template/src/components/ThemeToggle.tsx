"use client";

import { Moon, Sun } from "lucide-react";
import * as React from "react";
import { useTheme } from "./ThemeProvider";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div className="size-9 rounded-xl border border-border bg-card/50 flex items-center justify-center opacity-40" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="relative size-9 rounded-xl border border-border bg-card/60 hover:bg-card flex items-center justify-center text-foreground transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <Sun
        className={`size-4 text-amber-500 transition-all duration-300 transform ${
          isDark ? "rotate-90 scale-0 opacity-0 absolute" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`size-4 text-blue-400 transition-all duration-300 transform ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0 absolute"
        }`}
      />
    </button>
  );
}
