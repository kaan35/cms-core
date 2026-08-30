export interface ApiRequestOptions {
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  body?: unknown;
}

export interface ClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  getAuthToken?: () => string | null | undefined;
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

export function createApiClient(config: ClientConfig = {}) {
  const isServer = typeof window === "undefined";
  const baseUrl =
    config.baseUrl || process.env["API_URL"] || (isServer ? "http://localhost:3001" : "");

  function buildUrl(endpoint: string, params?: Record<string, unknown>): string {
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
    let fullUrl = `${base}${pathPart}`;

    if (params) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") {
          q.append(k, String(v));
        }
      }
      const qs = q.toString();
      if (qs) {
        fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs;
      }
    }

    return fullUrl;
  }

  async function request<T>(
    method: string,
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const url = buildUrl(endpoint, options.params);
    const token = config.getAuthToken ? config.getAuthToken() : undefined;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...config.defaultHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const init: RequestInit = {
      method,
      headers,
      cache: options.cache ?? "no-store",
    };

    if (options.body !== undefined) {
      init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const res = await fetch(url, init);

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
      resolveUrl: (mediaIdOrUrl?: string) => {
        if (!mediaIdOrUrl) return undefined;
        if (
          mediaIdOrUrl.startsWith("http://") ||
          mediaIdOrUrl.startsWith("https://") ||
          mediaIdOrUrl.startsWith("/")
        ) {
          return mediaIdOrUrl;
        }
        return `${baseUrl.replace(/\/$/, "")}/media/file/${mediaIdOrUrl}`;
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
