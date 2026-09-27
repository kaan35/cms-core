import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function resolveMediaUrl(mediaIdOrUrl?: string | null): string | null {
  if (!mediaIdOrUrl) return null;
  const trimmed = mediaIdOrUrl.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  // XSS protection: block javascript:, vbscript:, and unsafe data URIs
  if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") || lower.startsWith("data:")) {
    // Only permit safe raster images for data: URLs
    if (/^data:image\/(png|jpeg|jpg|webp|gif|bmp|avif);base64,/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  }

  // 1. If it's already an absolute or relative URL
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  // 2. Otherwise it's a media ID
  const apiBase =
    process.env.API_URL || (typeof window === "undefined" ? "http://localhost:3001" : "");
  return `${apiBase}/media/${trimmed}`;
}

export function getContrastForeground(hexColor: string): string {
  const clean = hexColor.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? "#09090b" : "#ffffff";
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? "#09090b" : "#ffffff";
  }
  return "#ffffff";
}

export function getFontFamilyCss(fontFamily?: string): string {
  switch (fontFamily) {
    case "Inter":
      return "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif";
    case "Roboto":
      return "var(--font-roboto), -apple-system, BlinkMacSystemFont, sans-serif";
    case "Geist":
    default:
      return "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif";
  }
}
