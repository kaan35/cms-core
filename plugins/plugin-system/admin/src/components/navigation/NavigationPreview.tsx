"use client";

import type { NavigationMenuItem } from "@cms/plugin-system-api";
import { ExternalLink, Sparkles } from "lucide-react";
import { getIconComponent } from "./icons";
import type { EffectiveMenuItem } from "./useNavigationMenu";

interface NavigationPreviewProps {
  siteTitle?: string | undefined;
  activeLocation: "header" | "footer";
  items: NavigationMenuItem[];
  getEffectiveItem: (item: NavigationMenuItem) => EffectiveMenuItem;
}

export function NavigationPreview({
  siteTitle,
  activeLocation,
  items,
  getEffectiveItem,
}: NavigationPreviewProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="size-3 text-primary" />
          Live {activeLocation === "header" ? "Header" : "Footer"} Preview
        </span>
        <span className="text-[10px] text-muted-foreground">Dynamic page-title synced</span>
      </div>

      <div className="rounded-xl border border-border/70 bg-background/90 p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs">
            <Sparkles className="size-3.5" />
          </div>
          <span className="font-bold text-sm text-foreground">{siteTitle || "Site Name"}</span>
        </div>

        <nav className="flex items-center gap-4 flex-wrap text-xs font-medium">
          {items.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">No links in this menu.</span>
          ) : (
            items.map((rawItem) => {
              const item = getEffectiveItem(rawItem);
              const IconComp = getIconComponent(item.icon);
              const isBtn = item.style === "button";
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-1.5 transition-all ${
                    isBtn
                      ? "bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-lg shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {IconComp && <IconComp className="size-3.5 shrink-0" />}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9.5px] font-bold px-2.5 py-1 rounded-full tracking-wide inline-flex items-center justify-center leading-none ml-1 ${
                        isBtn
                          ? "bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30"
                          : "bg-primary/15 text-primary border border-primary/25"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.external && <ExternalLink className="size-2.5 opacity-60 ml-0.5" />}
                </div>
              );
            })
          )}
        </nav>
      </div>
    </div>
  );
}
