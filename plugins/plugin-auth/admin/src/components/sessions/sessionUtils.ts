import { Globe, Laptop, Smartphone } from "lucide-react";

export interface SessionItem {
  id: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  current?: boolean;
  isCurrent?: boolean;
  isActive?: boolean;
  expiresAt: string;
  createdAt: string;
  lastActiveAt?: string;
}

export const formatDeviceName = (ua = "") => {
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
};

export const getDeviceIcon = (userAgent = "") => {
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return Smartphone;
  }
  if (ua.includes("mac") || ua.includes("windows") || ua.includes("linux")) {
    return Laptop;
  }
  return Globe;
};

export const isSessionActive = (session: SessionItem) => {
  if (session.isActive !== undefined) return session.isActive;
  return new Date(session.expiresAt).getTime() > Date.now();
};
