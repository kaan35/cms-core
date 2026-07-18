"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, LogOut, User } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";

export type Theme = "light" | "dark" | "system";

interface UserMenuProps {
  email: string;
  role: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onLogout: () => void;
  variant?: "compact" | "full";
  placement?: "bottom-end" | "top-start";
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
  { label: "System", value: "system" },
];

/**
 * Account dropdown (avatar trigger + profile link + logout + theme switcher).
 */
export function UserMenu({
  email,
  role,
  theme,
  onThemeChange,
  onLogout,
  variant = "full",
  placement = "bottom-end",
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = React.useId();

  const close = () => setIsOpen(false);

  /** Single effect: click-outside + Escape + arrow key navigation */
  useEffect(() => {
    if (!isOpen) return;

    const onEvent = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") {
          close();
          return;
        }

        // Arrow key navigation
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const items = Array.from(
            menuRef.current?.querySelectorAll<HTMLElement>(
              '[role="menuitem"]',
            ) ?? [],
          );
          if (items.length === 0) return;
          const current = items.indexOf(document.activeElement as HTMLElement);
          const next =
            e.key === "ArrowDown"
              ? (current + 1) % items.length
              : (current - 1 + items.length) % items.length;
          items[next].focus();
        }
        return;
      }

      // Click outside
      if (!containerRef.current?.contains(e.target as Node)) {
        close();
      }
    };

    document.addEventListener("mousedown", onEvent);
    document.addEventListener("keydown", onEvent);
    return () => {
      document.removeEventListener("mousedown", onEvent);
      document.removeEventListener("keydown", onEvent);
    };
  }, [isOpen]);

  const handleLogout = () => {
    close();
    onLogout();
  };

  const triggerClass = {
    compact:
      "h-8 w-8 rounded-full border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    full: "flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-accent transition duration-150 cursor-pointer w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none",
  } as const;

  const placementClass = {
    "bottom-end": "absolute right-0 top-full mt-2 w-64",
    "top-start": "absolute left-0 bottom-full mb-2 w-full md:w-64",
  } as const;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        className={triggerClass[variant]}
      >
        {variant === "compact" ? (
          <User className="h-4 w-4" aria-hidden="true" />
        ) : (
          <>
            <div className="h-5 w-5 rounded-full border border-border bg-muted flex items-center justify-center shrink-0">
              <User
                className="h-3 w-3 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="text-xs text-foreground/80 truncate min-w-0 text-left flex-1">
              {email}
            </span>
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="User options"
          className={cn(
            "rounded-lg border border-border bg-card shadow-lg z-50 focus:outline-none",
            placementClass[placement],
          )}
        >
          {/* Profile header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full border border-border bg-muted flex items-center justify-center shrink-0">
                <User
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {email}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                  {role}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1 px-1 space-y-0.5">
            <Link
              href="/profile"
              onClick={close}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition duration-150 cursor-pointer focus:outline-none focus:bg-accent focus:text-foreground"
            >
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              My Profile
            </Link>
            <button
              onClick={handleLogout}
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition duration-150 cursor-pointer focus:outline-none focus:bg-destructive/8 focus:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign Out
            </button>

            {/* Theme switcher */}
            <div className="px-3 py-1.5 border-t border-border flex items-center justify-between mt-1 pt-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">
                Theme
              </span>
              <div
                className="flex gap-0.5 bg-muted border border-border rounded-md p-0.5"
                role="group"
                aria-label="Select theme"
              >
                {THEME_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    size="sm"
                    role="menuitemradio"
                    variant={theme === opt.value ? "default" : "ghost"}
                    aria-checked={theme === opt.value}
                    onClick={() => onThemeChange(opt.value)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                      theme === opt.value
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
