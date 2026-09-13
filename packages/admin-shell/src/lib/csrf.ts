export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match && match[3] ? decodeURIComponent(match[3]) : null;
}

export function setCsrfToken(token: string): void {
  if (!token) return;
  if (typeof document !== "undefined") {
    document.cookie = "csrfToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("cms_csrf_token", token);
    } catch {
      // ignore
    }
  }
}

export function getCsrfToken(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("cms_csrf_token");
      if (stored) {
        return stored;
      }
    } catch {
      // ignore
    }
  }

  const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  const prefix = env ? env["NEXT_PUBLIC_COOKIE_PREFIX"] || "" : "";
  const fromCookie =
    (prefix ? getCookie(`${prefix}csrfToken`) : null) ||
    getCookie("cms_csrfToken") ||
    getCookie("pwm_csrfToken") ||
    getCookie("csrfToken") ||
    getCookie("csrf_token") ||
    getCookie("_csrf") ||
    getCookie("XSRF-TOKEN");

  if (fromCookie) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cms_csrf_token", fromCookie);
      } catch {
        // ignore
      }
    }
    return fromCookie;
  }

  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

  setCsrfToken(generated);
  return generated;
}
