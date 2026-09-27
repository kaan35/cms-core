import { cookies } from "next/headers";

export class ApiServerError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiServerError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type ServerQueryParamValue = string | number | boolean | null | undefined;

export interface ServerApiRequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, ServerQueryParamValue | ServerQueryParamValue[]>;
  timeout?: number;
}

async function serverRequest<T = unknown>(
  method: string,
  endpoint: string,
  body?: unknown,
  options: ServerApiRequestOptions = {},
): Promise<T> {
  const { params, headers = {}, timeout, ...customConfig } = options;
  const baseUrl = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");

  let path = endpoint.trim();
  // Strip "/api" prefix if present (backend server listens directly on root endpoints)
  if (path.startsWith("/api/")) {
    path = path.slice(4);
  } else if (path === "/api") {
    path = "/";
  }
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  let url = `${baseUrl}${path}`;
  if (params) {
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
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  // Retrieve incoming session cookies from Next.js server context
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...(headers as Record<string, string>),
  };

  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders["Content-Type"] = "application/json";
  }

  const timeoutMs = timeout ?? 30000;
  const controller = new AbortController();
  let timerId: ReturnType<typeof setTimeout> | undefined;

  if (timeoutMs > 0) {
    timerId = setTimeout(() => {
      controller.abort(new Error(`Server API request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  }

  if (customConfig.signal) {
    customConfig.signal.addEventListener("abort", () => {
      controller.abort(customConfig.signal?.reason);
    });
  }

  const config: RequestInit = {
    method,
    headers: reqHeaders,
    cache: customConfig.cache ?? "no-store",
    signal: controller.signal,
    ...customConfig,
  };

  if (body instanceof FormData) {
    config.body = body;
  } else if (typeof body === "string") {
    config.body = body;
  } else if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      throw new ApiServerError(
        408,
        `Request to ${endpoint} timed out after ${timeoutMs}ms`,
        "TIMEOUT",
      );
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

  if (!response.ok) {
    const errorData =
      isJson && typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
    throw new ApiServerError(
      response.status,
      String(errorData["error"] || errorData["message"] || response.statusText || "Request failed"),
      String(errorData["code"] || "SERVER_API_ERROR"),
      errorData["details"],
    );
  }

  return data as T;
}

/**
 * Server-side API client for Next.js Server Components.
 * Automatically forwards incoming cookies to CMS backend and handles URL normalization.
 */
export const apiServer = {
  get: <T = unknown>(endpoint: string, options?: ServerApiRequestOptions) =>
    serverRequest<T>("GET", endpoint, undefined, options),
  post: <T = unknown>(endpoint: string, body?: unknown, options?: ServerApiRequestOptions) =>
    serverRequest<T>("POST", endpoint, body, options),
  put: <T = unknown>(endpoint: string, body?: unknown, options?: ServerApiRequestOptions) =>
    serverRequest<T>("PUT", endpoint, body, options),
  patch: <T = unknown>(endpoint: string, body?: unknown, options?: ServerApiRequestOptions) =>
    serverRequest<T>("PATCH", endpoint, body, options),
  delete: <T = unknown>(endpoint: string, options?: ServerApiRequestOptions) =>
    serverRequest<T>("DELETE", endpoint, undefined, options),
};
