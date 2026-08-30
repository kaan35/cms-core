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

  // 1. If it's already an absolute or relative URL
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // 2. Otherwise it's a media ID
  const apiBase =
    process.env.API_URL || (typeof window === "undefined" ? "http://localhost:3001" : "");
  return `${apiBase}/media/${trimmed}`;
}
