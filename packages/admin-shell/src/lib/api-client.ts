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

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params, headers = {}, ...customConfig } = options;

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) searchParams.append(key, String(val));
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders["Content-Type"] = "application/json";
  }

  const csrfToken = getCsrfToken();
  if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(customConfig.method || "GET")) {
    reqHeaders["x-csrf-token"] = csrfToken;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: reqHeaders,
    credentials: "include",
  };

  if (body instanceof FormData) {
    config.body = body;
  } else if (typeof body === "string") {
    config.body = body;
  } else if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (
    isJson &&
    typeof data === "object" &&
    data !== null &&
    "csrfToken" in data &&
    typeof (data as Record<string, unknown>)["csrfToken"] === "string"
  ) {
    const { setCsrfToken } = await import("./csrf");
    setCsrfToken((data as Record<string, unknown>)["csrfToken"] as string);
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

export const api = {
  get: <T = unknown>(url: string, options?: RequestOptions) =>
    apiClient<T>(url, { ...options, method: "GET" }),
  post: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(url, { ...options, method: "POST", body }),
  put: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(url, { ...options, method: "PUT", body }),
  patch: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(url, { ...options, method: "PATCH", body }),
  delete: <T = unknown>(url: string, options?: RequestOptions) =>
    apiClient<T>(url, { ...options, method: "DELETE" }),
};
