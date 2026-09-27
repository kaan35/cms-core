import { getCsrfToken } from "./csrf";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown> | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown> | undefined,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type QueryParamValue = string | number | boolean | null | undefined;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, QueryParamValue | QueryParamValue[]>;
  timeout?: number;
  skipAuthRedirect?: boolean;
}

export interface ClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  credentials?: RequestCredentials;
  isExternal?: boolean;
  timeout?: number;
}

function getInternalOrigins(): string[] {
  const origins: string[] = [];
  try {
    const globalObj = typeof globalThis !== "undefined" ? globalThis : undefined;
    const proc = (
      globalObj as unknown as { process?: { env?: Record<string, string | undefined> } }
    )?.process;
    if (proc?.env?.["API_URL"]) origins.push(proc.env["API_URL"]);
    if (proc?.env?.["NEXT_PUBLIC_API_URL"]) origins.push(proc.env["NEXT_PUBLIC_API_URL"]);
    if (typeof window !== "undefined" && window.location?.origin) {
      origins.push(window.location.origin);
    }
  } catch {
    // Ignore in environments without window or process
  }
  return origins;
}

/**
 * Checks whether the given endpoint points to an external third-party URL.
 * Uses ultra-fast string checks (no regex overhead).
 */
export function isExternalUrl(endpoint: string): boolean {
  if (endpoint.startsWith("/")) return false;
  if (!endpoint.includes("://")) return false;
  const origins = getInternalOrigins();
  for (const origin of origins) {
    if (endpoint.startsWith(origin)) return false;
  }
  return true;
}

/**
 * Resolves request endpoint:
 * - External URLs are preserved as-is.
 * - Internal URLs automatically and idempotently receive the `/api` prefix (no `/api/api` duplicate).
 */
export function resolveRequestUrl(
  endpoint: string,
  baseUrl: string = "",
  defaultPrefix: string = "/api",
): { url: string; isExternal: boolean } {
  const isExternal = isExternalUrl(endpoint);
  if (isExternal) {
    return { url: endpoint, isExternal: true };
  }

  let path = endpoint.trim();
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  const isDirectBackend = Boolean(baseUrl && /^https?:\/\//i.test(baseUrl));
  if (isDirectBackend) {
    path = path.replace(/^\/api(?=\/|$)/, "");
    if (!path.startsWith("/")) path = `/${path}`;
    const base = baseUrl.replace(/\/$/, "");
    return { url: `${base}${path}`, isExternal: false };
  }

  if (defaultPrefix) {
    const cleanPrefix = defaultPrefix.startsWith("/") ? defaultPrefix : `/${defaultPrefix}`;
    if (!path.startsWith(cleanPrefix)) {
      path = `${cleanPrefix}${path}`;
    }
  }

  const base = baseUrl ? baseUrl.replace(/\/$/, "") : "";
  return { url: `${base}${path}`, isExternal: false };
}

/**
 * Appends query parameters with support for arrays and filtering of null/undefined values.
 */
export function appendQueryParams(
  url: string,
  params?: Record<string, QueryParamValue | QueryParamValue[]>,
): string {
  if (!params) return url;
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null || val === "") continue;
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item !== undefined && item !== null && item !== "") {
          searchParams.append(key, String(item));
        }
      }
    } else {
      searchParams.append(key, String(val));
    }
  }
  const qs = searchParams.toString();
  if (!qs) return url;
  return url + (url.includes("?") ? "&" : "?") + qs;
}

/**
 * Internal HTTP execution engine with timeout, security isolation, and session handling.
 */
async function executeRequest<T = unknown>(
  method: string,
  endpoint: string,
  body?: unknown,
  options: RequestOptions = {},
  customBaseUrl?: string,
  forceExternal?: boolean,
  defaultTimeout?: number,
): Promise<T> {
  const {
    body: optBody,
    params,
    headers = {},
    timeout,
    skipAuthRedirect,
    ...customConfig
  } = options;

  const { url: rawUrl, isExternal: detectedExternal } = resolveRequestUrl(
    endpoint,
    customBaseUrl,
    "/api",
  );
  const isExternal = forceExternal ?? detectedExternal;
  const url = appendQueryParams(rawUrl, params);

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  const payload = body !== undefined ? body : optBody;
  if (payload !== undefined && !(payload instanceof FormData)) {
    reqHeaders["Content-Type"] = "application/json";
  }

  // Security: CSRF token is ONLY sent to internal CMS endpoints, NEVER to third-party domains
  if (!isExternal) {
    const csrfToken = getCsrfToken();
    if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)) {
      reqHeaders["x-csrf-token"] = csrfToken;
    }
  }

  // Timeout & AbortController support
  const timeoutMs = timeout ?? defaultTimeout ?? 30000;
  const controller = new AbortController();
  let timerId: ReturnType<typeof setTimeout> | undefined;

  if (timeoutMs > 0) {
    timerId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  }

  if (customConfig.signal) {
    customConfig.signal.addEventListener("abort", () => {
      controller.abort(customConfig.signal?.reason);
    });
  }

  // Security: Session credentials default to "same-origin" for external requests to prevent cookie leaks
  const config: RequestInit = {
    ...customConfig,
    method,
    headers: reqHeaders,
    credentials: customConfig.credentials ?? (isExternal ? "same-origin" : "include"),
    signal: controller.signal,
  };

  if (payload instanceof FormData) {
    config.body = payload;
  } else if (typeof payload === "string") {
    config.body = payload;
  } else if (payload !== undefined) {
    config.body = JSON.stringify(payload);
  }

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      throw new ApiError(408, "TIMEOUT", `Request to ${endpoint} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  // Only update CSRF token if coming from internal CMS response
  if (
    !isExternal &&
    isJson &&
    typeof data === "object" &&
    data !== null &&
    "csrfToken" in data &&
    typeof (data as Record<string, unknown>)["csrfToken"] === "string"
  ) {
    const { setCsrfToken } = await import("./csrf");
    setCsrfToken((data as Record<string, unknown>)["csrfToken"] as string);
  }

  // 401 Session Expiration Interceptor: Auto-redirect to login
  if (
    response.status === 401 &&
    !isExternal &&
    !skipAuthRedirect &&
    typeof window !== "undefined"
  ) {
    const currentPath = window.location.pathname;
    if (currentPath !== "/login" && currentPath !== "/setup") {
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath + window.location.search)}&expired=true`;
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 100);
    }
  }

  if (!response.ok) {
    const errorData =
      isJson && typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
    throw new ApiError(
      response.status,
      String(errorData["code"] || "REQUEST_FAILED"),
      String(errorData["error"] || errorData["message"] || response.statusText || "Request failed"),
      errorData["details"] as Record<string, unknown> | undefined,
    );
  }

  return data as T;
}

/**
 * Creates an isolated API client instance with dedicated baseUrl, headers, and security options.
 */
export function createApiClient(config: ClientConfig = {}) {
  const {
    baseUrl = "",
    defaultHeaders = {},
    credentials,
    isExternal: configIsExternal,
    timeout: defaultTimeout,
  } = config;

  return {
    get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
      executeRequest<T>(
        "GET",
        endpoint,
        undefined,
        {
          ...options,
          headers: { ...defaultHeaders, ...(options?.headers as Record<string, string>) },
          ...(credentials !== undefined ? { credentials } : {}),
        },
        baseUrl,
        configIsExternal,
        defaultTimeout,
      ),
    post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
      executeRequest<T>(
        "POST",
        endpoint,
        body,
        {
          ...options,
          headers: { ...defaultHeaders, ...(options?.headers as Record<string, string>) },
          ...(credentials !== undefined ? { credentials } : {}),
        },
        baseUrl,
        configIsExternal,
        defaultTimeout,
      ),
    put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
      executeRequest<T>(
        "PUT",
        endpoint,
        body,
        {
          ...options,
          headers: { ...defaultHeaders, ...(options?.headers as Record<string, string>) },
          ...(credentials !== undefined ? { credentials } : {}),
        },
        baseUrl,
        configIsExternal,
        defaultTimeout,
      ),
    patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
      executeRequest<T>(
        "PATCH",
        endpoint,
        body,
        {
          ...options,
          headers: { ...defaultHeaders, ...(options?.headers as Record<string, string>) },
          ...(credentials !== undefined ? { credentials } : {}),
        },
        baseUrl,
        configIsExternal,
        defaultTimeout,
      ),
    delete: <T = unknown>(endpoint: string, options?: RequestOptions) =>
      executeRequest<T>(
        "DELETE",
        endpoint,
        undefined,
        {
          ...options,
          headers: { ...defaultHeaders, ...(options?.headers as Record<string, string>) },
          ...(credentials !== undefined ? { credentials } : {}),
        },
        baseUrl,
        configIsExternal,
        defaultTimeout,
      ),
  };
}

/**
 * Standard CMS Browser Client.
 * Automatically prefixes internal endpoints with `/api` and provides clean REST methods.
 */
export const api = {
  get: <T = unknown>(url: string, options?: RequestOptions) =>
    executeRequest<T>("GET", url, undefined, options),
  post: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    executeRequest<T>("POST", url, body, options),
  put: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    executeRequest<T>("PUT", url, body, options),
  patch: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    executeRequest<T>("PATCH", url, body, options),
  delete: <T = unknown>(url: string, options?: RequestOptions) =>
    executeRequest<T>("DELETE", url, undefined, options),
  create: createApiClient,
  external: {
    get: <T = unknown>(url: string, options?: RequestOptions) =>
      executeRequest<T>("GET", url, undefined, options, undefined, true),
    post: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
      executeRequest<T>("POST", url, body, options, undefined, true),
    put: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
      executeRequest<T>("PUT", url, body, options, undefined, true),
    patch: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
      executeRequest<T>("PATCH", url, body, options, undefined, true),
    delete: <T = unknown>(url: string, options?: RequestOptions) =>
      executeRequest<T>("DELETE", url, undefined, options, undefined, true),
  },
};

/**
 * Unified request umbrella object for services.
 */
export const request = {
  api,
};
