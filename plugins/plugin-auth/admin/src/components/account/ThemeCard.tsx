"use client";

import { cn, toast } from "@cms/admin-shell";
import { Check, Laptop, Moon, Palette, Sun } from "lucide-react";
import * as React from "react";

export function ThemeCard() {
  const [theme, setTheme] = React.useState<"light" | "dark" | "system">("dark");

  React.useEffect(() => {
    const saved = (localStorage.getItem("theme") as "light" | "dark" | "system") || "dark";
    setTheme(saved);
  }, []);

  const changeTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (newTheme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(systemDark ? "dark" : "light");
    } else {
      root.classList.add(newTheme);
    }
    toast.success(`Theme switched to ${newTheme}`);
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
        <Palette className="size-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Appearance & Theme</h2>
          <p className="text-xs text-muted-foreground">
            Customize the interface theme and visual mode for your account
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Dark Theme Option */}
        <button
          type="button"
          onClick={() => changeTheme("dark")}
          className={cn(
            "group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all cursor-pointer",
            theme === "dark"
              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
              : "border-border/80 bg-card hover:bg-muted/40 hover:border-border",
          )}
        >
          <div className="flex w-full items-center justify-between mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-100 border border-zinc-700">
              <Moon className="size-4" />
            </div>
            {theme === "dark" && (
              <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </div>
            )}
          </div>
          <h3 className="font-semibold text-xs text-foreground">Dark Theme</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Sleek charcoal & zinc contrast designed for low-light environments.
          </p>
        </button>

        {/* Light Theme Option */}
        <button
          type="button"
          onClick={() => changeTheme("light")}
          className={cn(
            "group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all cursor-pointer",
            theme === "light"
              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
              : "border-border/80 bg-card hover:bg-muted/40 hover:border-border",
          )}
        >
          <div className="flex w-full items-center justify-between mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-300">
              <Sun className="size-4" />
            </div>
            {theme === "light" && (
              <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </div>
            )}
          </div>
          <h3 className="font-semibold text-xs text-foreground">Light Theme</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Crisp white canvas with high legibility and light borders.
          </p>
        </button>

        {/* System Theme Option */}
        <button
          type="button"
          onClick={() => changeTheme("system")}
          className={cn(
            "group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all cursor-pointer",
            theme === "system"
              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
              : "border-border/80 bg-card hover:bg-muted/40 hover:border-border",
          )}
        >
          <div className="flex w-full items-center justify-between mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border/80">
              <Laptop className="size-4" />
            </div>
            {theme === "system" && (
              <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </div>
            )}
          </div>
          <h3 className="font-semibold text-xs text-foreground">System Default</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Automatically synchronize with your operating system theme.
          </p>
        </button>
      </div>
    </div>
  );
}
