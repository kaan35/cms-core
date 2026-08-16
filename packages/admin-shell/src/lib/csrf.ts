export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match && match[3] ? decodeURIComponent(match[3]) : null;
}

export function setCsrfToken(token: string): void {
  if (!token) return;
  if (typeof document !== "undefined") {
    document.cookie = `csrfToken=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("cms_csrf_token", token);
    } catch {
      // ignore
    }
  }
}

export function getCsrfToken(): string | null {
  const fromCookie =
    getCookie("csrfToken") ||
    getCookie("csrf_token") ||
    getCookie("_csrf") ||
    getCookie("XSRF-TOKEN");
  if (fromCookie) return fromCookie;

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("cms_csrf_token");
      if (stored) return stored;
    } catch {
      // ignore
    }
  }
  return null;
}
