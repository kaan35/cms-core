"use client";

import { ChevronUp, LogOut, User } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function UserMenu() {
  const { user, logout } = useAuth();
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
  };

  const email = user?.email || "admin@cms.com";
  const roleName = user?.role || "Administrator";

  return (
    <Popover>
      <PopoverTrigger className="flex w-full items-center justify-between gap-2.5 rounded-xl p-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all cursor-pointer select-none outline-none border border-transparent hover:border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted border border-border text-foreground text-xs font-semibold">
            <User className="size-3.5" />
          </div>
          <span className="truncate text-foreground font-medium text-xs">{email}</span>
        </div>
        <ChevronUp className="size-3.5 shrink-0 opacity-60" />
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-64 p-3 rounded-2xl bg-card text-card-foreground border-border/80 shadow-2xl backdrop-blur-md space-y-2"
      >
        {/* User Card */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/60">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border text-foreground text-sm font-semibold">
            <User className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">{email}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{roleName}</p>
          </div>
        </div>

        {/* Action Items */}
        <div className="space-y-0.5 pt-1">
          <Link
            href="/dashboard/account"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <User className="size-3.5" />
            <span>My Profile</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Theme Switcher */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Theme</span>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-0.5 border border-border/40">
              <button
                type="button"
                onClick={() => changeTheme("dark")}
                className={cn(
                  "flex items-center justify-center px-2 py-0.5 text-[11px] font-medium rounded-md transition-all cursor-pointer",
                  theme === "dark"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => changeTheme("light")}
                className={cn(
                  "flex items-center justify-center px-2 py-0.5 text-[11px] font-medium rounded-md transition-all cursor-pointer",
                  theme === "light"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => changeTheme("system")}
                className={cn(
                  "flex items-center justify-center px-2 py-0.5 text-[11px] font-medium rounded-md transition-all cursor-pointer",
                  theme === "system"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                System
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
