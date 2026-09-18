"use client";

import * as React from "react";

export interface BrandThemeSyncProps {
  primaryColor?: string;
  foregroundColor?: string;
  fontFamilyCss?: string;
}

export function BrandThemeSync({
  primaryColor,
  foregroundColor,
  fontFamilyCss,
}: BrandThemeSyncProps) {
  React.useEffect(() => {
    if (!primaryColor) return;
    const root = document.documentElement;
    root.style.setProperty("--primary", primaryColor);
    root.style.setProperty("--color-primary", primaryColor);
    if (foregroundColor) {
      root.style.setProperty("--primary-foreground", foregroundColor);
      root.style.setProperty("--color-primary-foreground", foregroundColor);
    }
    if (fontFamilyCss) {
      root.style.setProperty("--font-family", fontFamilyCss);
    }
  }, [primaryColor, foregroundColor, fontFamilyCss]);

  return null;
}
