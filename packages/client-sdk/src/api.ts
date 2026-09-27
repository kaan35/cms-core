export type QueryParamValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions {
  params?: Record<string, QueryParamValue | QueryParamValue[]>;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}

export interface ClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  getAuthToken?: () => string | null | undefined;
  timeout?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function appendQueryParams(
  url: string,
  params?: Record<string, QueryParamValue | QueryParamValue[]>,
): string {
  if (!params) return url;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item !== undefined && item !== null && item !== "") {
          q.append(k, String(item));
        }
      }
    } else {
      q.append(k, String(v));
    }
  }
  const qs = q.toString();
  if (!qs) return url;
  return url + (url.includes("?") ? "&" : "?") + qs;
}

export function createApiClient(config: ClientConfig = {}) {
  const isServer = typeof window === "undefined";
  const baseUrl =
    config.baseUrl || process.env["API_URL"] || (isServer ? "http://localhost:3001" : "");

  function isExternal(endpoint: string): boolean {
    if (endpoint.startsWith("/")) return false;
    if (
      endpoint.startsWith("http://") ||
      endpoint.startsWith("https://") ||
      endpoint.startsWith("//")
    ) {
      if (baseUrl && endpoint.startsWith(baseUrl)) return false;
      return true;
    }
    return false;
  }

  function buildUrl(
    endpoint: string,
    params?: Record<string, QueryParamValue | QueryParamValue[]>,
  ): string {
    if (isExternal(endpoint)) {
      return appendQueryParams(endpoint, params);
    }

    const isDirectBackend = Boolean(
      baseUrl && (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")),
    );
    let normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    if (isDirectBackend) {
      // Direct backend call (e.g. Node.js SSR http://localhost:3001): strip /api prefix
      normalizedEndpoint = normalizedEndpoint.replace(/^\/api(?=\/|$)/, "");
    } else {
      // Browser proxy call (e.g. client-side Next.js rewrite): ensure /api prefix
      if (!normalizedEndpoint.startsWith("/api/") && normalizedEndpoint !== "/api") {
        normalizedEndpoint = `/api${normalizedEndpoint}`;
      }
    }

    const base = baseUrl.replace(/\/$/, "");
    const pathPart = normalizedEndpoint.startsWith("/")
      ? normalizedEndpoint
      : `/${normalizedEndpoint}`;
    const fullUrl = `${base}${pathPart}`;

    return appendQueryParams(fullUrl, params);
  }

  async function request<T>(
    method: string,
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const url = buildUrl(endpoint, options.params);
    const external = isExternal(endpoint);
    // Security: Do NOT attach internal CMS auth token to external third-party URLs
    const token = !external && config.getAuthToken ? config.getAuthToken() : undefined;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...config.defaultHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const timeoutMs = options.timeout ?? config.timeout ?? 30000;
    const controller = new AbortController();
    let timerId: ReturnType<typeof setTimeout> | undefined;

    if (timeoutMs > 0) {
      timerId = setTimeout(() => {
        controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        controller.abort(options.signal?.reason);
      });
    }

    const init: RequestInit = {
      method,
      headers,
      cache: options.cache ?? "no-store",
      signal: controller.signal,
    };

    if (options.next) {
      (init as Record<string, unknown>)["next"] = options.next;
    }

    if (options.body !== undefined) {
      init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        throw new ApiError(`Request to ${endpoint} timed out after ${timeoutMs}ms`, 408, {
          timeout: timeoutMs,
        });
      }
      throw err;
    } finally {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
    }

    if (res.status === 204) {
      return {} as T;
    }

    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const errMsg =
        typeof data === "object" && data !== null && "error" in data
          ? String((data as { error: unknown }).error)
          : typeof data === "object" && data !== null && "message" in data
            ? String((data as { message: unknown }).message)
            : res.statusText || "Request failed";

      throw new ApiError(errMsg, res.status, data);
    }

    return data as T;
  }

  return {
    get: async <T = unknown>(endpoint: string, options?: ApiRequestOptions): Promise<T> => {
      return request<T>("GET", endpoint, options);
    },

    post: async <T = unknown>(
      endpoint: string,
      body?: unknown,
      options?: Omit<ApiRequestOptions, "body">,
    ): Promise<T> => {
      return request<T>("POST", endpoint, { ...options, body });
    },

    put: async <T = unknown>(
      endpoint: string,
      body?: unknown,
      options?: Omit<ApiRequestOptions, "body">,
    ): Promise<T> => {
      return request<T>("PUT", endpoint, { ...options, body });
    },

    patch: async <T = unknown>(
      endpoint: string,
      body?: unknown,
      options?: Omit<ApiRequestOptions, "body">,
    ): Promise<T> => {
      return request<T>("PATCH", endpoint, { ...options, body });
    },

    delete: async <T = unknown>(endpoint: string, options?: ApiRequestOptions): Promise<T> => {
      return request<T>("DELETE", endpoint, options);
    },

    media: {
      resolveUrl: (mediaIdOrUrl?: string): string | undefined => {
        if (!mediaIdOrUrl) return undefined;
        const trimmed = mediaIdOrUrl.trim();
        if (!trimmed) return undefined;

        const lower = trimmed.toLowerCase();
        // XSS sanitization: block dangerous protocols
        if (
          lower.startsWith("javascript:") ||
          lower.startsWith("vbscript:") ||
          lower.startsWith("data:")
        ) {
          // Only permit safe raster images for data: URLs
          if (/^data:image\/(png|jpeg|jpg|webp|gif|bmp|avif);base64,/i.test(trimmed)) {
            return trimmed;
          }
          return undefined;
        }

        if (
          trimmed.startsWith("http://") ||
          trimmed.startsWith("https://") ||
          trimmed.startsWith("/")
        ) {
          return trimmed;
        }
        return `${baseUrl.replace(/\/$/, "")}/media/file/${trimmed}`;
      },
    },
  };
}

/**
 * Singleton API client instance
 */
export const api = createApiClient();

/**
 * Helper to safely unwrap paginated list responses ({ data: T[] } or T[])
 */
export function extractData<T>(res: unknown): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (
    typeof res === "object" &&
    res !== null &&
    "data" in res &&
    Array.isArray((res as { data: unknown }).data)
  ) {
    return (res as { data: T[] }).data;
  }
  return [];
}
