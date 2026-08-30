"use client";

import {
  Badge,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cms/admin-shell";
import type { NavigationMenuItem } from "@cms/plugin-system-api";
import { ArrowDown, ArrowUp, ExternalLink, RefreshCw, Tag, Trash2 } from "lucide-react";
import { AVAILABLE_ICONS } from "./icons";
import type { EffectiveMenuItem, PublishedPage } from "./useNavigationMenu";

interface MenuItemCardProps {
  item: EffectiveMenuItem;
  index: number;
  totalItems: number;
  publishedPages: PublishedPage[];
  onMoveItem: (index: number, direction: "up" | "down") => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, patch: Partial<NavigationMenuItem>) => void;
}

export function MenuItemCard({
  item,
  index,
  totalItems,
  publishedPages,
  onMoveItem,
  onRemoveItem,
  onUpdateItem,
}: MenuItemCardProps) {
  const isButton = item.style === "button";
  const isPageType = item.type === "page";

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3.5 transition-all">
      {/* Item Header & Controls */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Move Up"
              disabled={index === 0}
              onClick={() => onMoveItem(index, "up")}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors cursor-pointer"
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              type="button"
              title="Move Down"
              disabled={index === totalItems - 1}
              onClick={() => onMoveItem(index, "down")}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors cursor-pointer"
            >
              <ArrowDown className="size-4" />
            </button>
          </div>

          <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>

          <Badge
            variant="outline"
            className="text-[10px] py-0.5 px-2 uppercase font-semibold font-mono"
          >
            {item.type === "page" ? "CMS Page" : item.type === "blog" ? "Blog" : "Custom Link"}
          </Badge>

          {isPageType && (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                !item.customLabel
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-muted text-muted-foreground border border-border/70"
              }`}
            >
              {!item.customLabel ? (
                <>
                  <RefreshCw className="size-3 animate-spin" />
                  <span>Auto-Synced with Page</span>
                </>
              ) : (
                <span>Custom Title Override</span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Delete Item"
            onClick={() => onRemoveItem(item.id)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Field Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Label */}
        <div className="md:col-span-4 space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-muted-foreground">Menu Title / Label *</Label>
            {isPageType && (
              <button
                type="button"
                onClick={() => {
                  if (!item.customLabel) {
                    onUpdateItem(item.id, {
                      customLabel: true,
                      label: item.label,
                    });
                  } else {
                    const matched = publishedPages.find((p) => p.id === item.pageId);
                    onUpdateItem(item.id, {
                      customLabel: false,
                      label: matched ? matched.title : item.label,
                    });
                  }
                }}
                className="text-[10px] text-primary hover:underline cursor-pointer"
              >
                {!item.customLabel ? "Customize title" : "↺ Auto-sync with page"}
              </button>
            )}
          </div>
          <Input
            placeholder="e.g. Home, Contact Us, Pricing"
            value={item.label}
            onChange={(e) =>
              onUpdateItem(item.id, {
                label: e.target.value,
                customLabel: isPageType ? true : undefined,
              })
            }
            className="h-8 text-xs font-medium"
          />
        </div>

        {/* URL / Page selector */}
        <div className="md:col-span-5 space-y-1">
          <Label className="text-[11px] text-muted-foreground">Target URL / Route *</Label>
          {item.type === "page" && publishedPages.length > 0 ? (
            <div className="flex items-center gap-2">
              <Select
                value={item.pageId || ""}
                onValueChange={(pId) => {
                  const found = publishedPages.find((p) => p.id === pId);
                  if (found) {
                    onUpdateItem(item.id, {
                      pageId: found.id,
                      url: `/${found.slug.replace(/^\//, "")}`,
                      ...(!item.customLabel ? { label: found.title } : {}),
                    });
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Select linked page" />
                </SelectTrigger>
                <SelectContent>
                  {publishedPages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} (/{p.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Input
              placeholder="e.g. /about, /blog, https://..."
              value={item.url}
              onChange={(e) => onUpdateItem(item.id, { url: e.target.value })}
              className="h-8 text-xs font-mono"
            />
          )}
        </div>

        {/* Icon Selector */}
        <div className="md:col-span-3 space-y-1">
          <Label className="text-[11px] text-muted-foreground">Icon</Label>
          <Select
            value={item.icon || "none"}
            onValueChange={(val) =>
              onUpdateItem(item.id, {
                icon: !val || val === "none" ? undefined : val,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_ICONS.map((ico) => {
                const IcoComponent = ico.icon;
                return (
                  <SelectItem key={ico.id} value={ico.id}>
                    <div className="flex items-center gap-2">
                      {IcoComponent && <IcoComponent className="size-3.5 text-primary" />}
                      <span>{ico.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Secondary Row: Appearance Styling (Button/Badge/External) */}
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
    </div>
  );
}
