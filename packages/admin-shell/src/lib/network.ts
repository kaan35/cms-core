import { Laptop, Smartphone, type LucideIcon } from "lucide-react";

/**
 * Normalizes IPv4-mapped IPv6 addresses (e.g., "::ffff:127.0.0.1")
 * and provides human-readable labels for loopback addresses.
 */
export function formatIp(ip?: string | null): string {
  if (!ip) return "—";
  const cleaned = ip.replace(/^::ffff:/, "");
  if (cleaned === "127.0.0.1" || cleaned === "::1") return "Localhost (127.0.0.1)";
  return cleaned;
}

/**
 * Parses a standard User-Agent header and returns a readable browser and OS summary.
 * e.g., "Chrome (macOS)", "Firefox (Linux)"
 */
export function formatDeviceName(ua = ""): string {
  if (!ua) return "Unknown Device";
  let browser = "Web Browser";
  let os = "Desktop";

  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/")) browser = "Safari";

  if (ua.includes("iPhone")) os = "iOS";
  else if (ua.includes("iPad")) os = "iPadOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} (${os})`;
}

/**
 * Resolves a semantic Lucide icon based on the user agent string.
 */
export function getDeviceIcon(userAgent = ""): LucideIcon {
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return Smartphone;
  }
  return Laptop;
}
