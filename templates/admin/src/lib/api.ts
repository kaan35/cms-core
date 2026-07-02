/**
 * Core API fetch utility used by SWR and TanStack adapters.
 *
 * The base URL is intentionally omitted — Next.js rewrites proxy
 * /api/* → internal API server, so relative paths work in all environments.
 *
 * @example apiFetch("/api/blog")  → proxied to http://api:3001/blog
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = { ...options.headers } as Record<string, string>;
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  // Set default credentials to include cookies
  const defaultOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers,
  };

  // Ensure requests are routed via Next.js rewrites proxy (/api/* -> backend:3001/*)
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const proxyPath = normalizedPath.startsWith("/api") ? normalizedPath : `/api${normalizedPath}`;

  const response = await fetch(proxyPath, defaultOptions);

  if (response.status === 401 && !path.includes("/auth/login")) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(
      data.message || "Something went wrong",
      response.status,
      data
    );
  }

  return data;
}
