"use client";

import { ChevronUp, Laptop, LogOut, Moon, Sun, User } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = React.useState(false);
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

  const email = user?.email || user?.name || "";
  const initial = (email || "U").charAt(0).toUpperCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Sidebar Footer Trigger */}
      <PopoverTrigger className="flex w-full items-center justify-between gap-2.5 rounded-xl p-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all cursor-pointer select-none outline-none border border-transparent hover:border-border/60 data-state-open:bg-muted/60 data-state-open:border-border/60">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
            {initial}
          </div>
          <span className="truncate text-foreground font-medium text-xs text-left" title={email}>
            {email || "My Account"}
          </span>
        </div>
        <ChevronUp
          className={cn(
            "size-3.5 shrink-0 opacity-60 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </PopoverTrigger>

      {/* Claude/Linear-style Clean Popover Menu */}
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-64 p-1.5 rounded-xl bg-card text-card-foreground border border-border/80 shadow-xl space-y-0.5 select-none outline-none"
      >
        {/* User Identity Header */}
        <div className="px-3 py-2 text-xs text-muted-foreground truncate" title={email}>
          {email || "My Account"}
        </div>

        <div className="h-px bg-border/40 my-1" />

        {/* Profile & Account Link */}
        <Link
          href="/dashboard/account"
          onClick={() => setOpen(false)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-normal text-foreground hover:bg-muted/80 transition-colors cursor-pointer outline-none"
        >
          <User className="size-4 text-muted-foreground shrink-0" />
          <span className="truncate">My Profile & Account</span>
        </Link>

        {/* Compact Theme Row */}
        <div className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs text-foreground">
          <div className="flex items-center gap-3">
            <Moon className="size-4 text-muted-foreground shrink-0" />
            <span>Theme</span>
          </div>

          <div className="flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5 border border-border/50">
            <button
              type="button"
              onClick={() => changeTheme("dark")}
              title="Dark Theme"
              className={cn(
                "flex items-center justify-center size-6 rounded transition-all cursor-pointer",
                theme === "dark"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Moon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => changeTheme("light")}
              title="Light Theme"
              className={cn(
                "flex items-center justify-center size-6 rounded transition-all cursor-pointer",
                theme === "light"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sun className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => changeTheme("system")}
              title="System Theme"
              className={cn(
                "flex items-center justify-center size-6 rounded transition-all cursor-pointer",
                theme === "system"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Laptop className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="h-px bg-border/40 my-1" />

        {/* Sign Out Action */}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            logout();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-normal text-destructive hover:bg-destructive/10 transition-colors cursor-pointer outline-none"
        >
          <LogOut className="size-4 text-destructive shrink-0" />
          <span>Log out</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
