"use client";

import type { NavigationMenuItem } from "@cms/plugin-system-api";
import { ExternalLink, Tag } from "lucide-react";

interface MenuItemAppearanceProps {
  item: NavigationMenuItem;
  onUpdateItem: (id: string, patch: Partial<NavigationMenuItem>) => void;
}

export function MenuItemAppearance({ item, onUpdateItem }: MenuItemAppearanceProps) {
  const isButton = item.style === "button";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Style: Link vs Button */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Style:</span>
          <button
            type="button"
            onClick={() => onUpdateItem(item.id, { style: "link" })}
            className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
              !isButton
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Standard Link
          </button>
          <button
            type="button"
            onClick={() => onUpdateItem(item.id, { style: "button" })}
            className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
              isButton
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            CTA Button
          </button>
        </div>

        {/* Badge */}
        <div className="flex items-center gap-1.5">
          <Tag className="size-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground font-medium">Badge:</span>
          <input
            type="text"
            placeholder="e.g. New, Pro"
            value={item.badge || ""}
            onChange={(e) => onUpdateItem(item.id, { badge: e.target.value || undefined })}
            className="h-6 w-20 px-2 rounded-md border border-border bg-background text-[11px] focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* External target */}
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={item.external || false}
          onChange={(e) => onUpdateItem(item.id, { external: e.target.checked })}
          className="size-3.5 rounded border-border"
        />
        <span className="text-[11px] flex items-center gap-1">
          Open in new tab <ExternalLink className="size-3 opacity-60" />
        </span>
      </label>
    </div>
  );
}
