import process from "node:process";

export interface ApiClientConfig {
  baseUrl?: string | undefined;
  apiKey?: string | undefined;
  timeout?: number | undefined;
}

export class CmsApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "CmsApiError";
    this.status = status;
    this.data = data;
  }
}

export interface ListPagesQuery {
  limit?: number | undefined;
  offset?: number | undefined;
  search?: string | undefined;
}

export interface CreatePageDraftInput {
  title: string;
  slug: string;
  blocks: unknown[];
}

export interface ListBlogPostsQuery {
  limit?: number | undefined;
  status?: string | undefined;
  search?: string | undefined;
}

export interface CreateBlogDraftInput {
  title: string;
  slug: string;
  body: string;
  tags?: string[] | undefined;
  seoDescription?: string | undefined;
}

export type QueryParamValue = string | number | boolean | null | undefined;

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

const DEFAULT_API_URL = "http://localhost:3001";
const DEFAULT_TIMEOUT_MS = 30_000;

export class CmsApiClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string | undefined;
  private readonly timeout: number;

  constructor(config: ApiClientConfig = {}) {
    const rawUrl = config.baseUrl ?? process.env["CMS_API_URL"] ?? DEFAULT_API_URL;
    this.baseUrl = rawUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey ?? process.env["CMS_API_KEY"];
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options: {
      params?: Record<string, QueryParamValue | QueryParamValue[]>;
      body?: unknown;
    } = {},
  ): Promise<T> {
    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = appendQueryParams(`${this.baseUrl}${normalizedEndpoint}`, options.params);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };

    const controller = new AbortController();
    const timerId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${this.timeout}ms`));
    }, this.timeout);

    try {
      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };
      if (options.body !== undefined) {
        init.body = JSON.stringify(options.body);
      }
      const res = await fetch(url, init);

      if (res.status === 204) {
        return {} as T;
      }

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as { error: unknown }).error)
            : typeof data === "object" && data !== null && "message" in data
              ? String((data as { message: unknown }).message)
              : `CMS API responded with HTTP ${res.status}: ${res.statusText || "Request failed"}`;

        throw new CmsApiError(message, res.status, data);
      }

      return data as T;
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        throw new CmsApiError(`Request to ${endpoint} timed out after ${this.timeout}ms`, 408);
      }
      if (err instanceof CmsApiError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new CmsApiError(`Network failure while requesting ${endpoint}: ${message}`, 500, err);
    } finally {
      clearTimeout(timerId);
    }
  }

  /**
   * Infrastructure health check (database and cache connectivity)
   */
  async getHealth(): Promise<{ status: string; db: string; cache: string }> {
    return this.request("GET", "/health");
  }

  /**
   * System statistics (process uptime, memory, version)
   */
  async getStats(): Promise<Record<string, unknown>> {
    return this.request("GET", "/system/stats");
  }

  /**
   * List pages with optional pagination and search filter
   */
  async listPages(query?: ListPagesQuery): Promise<unknown> {
    if (query?.search) {
      return this.request("GET", "/pages/search", {
        params: {
          q: query.search,
          limit: query.limit,
          offset: query.offset,
        },
      });
    }

    return this.request("GET", "/pages", {
      params: {
        limit: query?.limit,
        offset: query?.offset,
      },
    });
  }

  /**
   * Retrieve a page by its URL slug or unique ID
   */
  async getPage(slug: string): Promise<unknown> {
    return this.request("GET", `/pages/${encodeURIComponent(slug)}`);
  }

  /**
   * Create a new draft page with block-based content
   */
  async createPageDraft(data: CreatePageDraftInput): Promise<unknown> {
    return this.request("POST", "/pages", {
      body: {
        title: data.title,
        slug: data.slug,
        status: "draft",
        blocks: data.blocks,
      },
    });
  }

  /**
   * List blog articles with status and search filtering
   */
  async listBlogPosts(query?: ListBlogPostsQuery): Promise<unknown> {
    if (query?.search) {
      return this.request("GET", "/blog/search", {
        params: {
          q: query.search,
          limit: query.limit,
        },
      });
    }

    return this.request("GET", "/blog", {
      params: {
        limit: query?.limit,
        status: query?.status,
      },
    });
  }

  /**
   * Retrieve a single blog post by its slug or ID
   */
  async getBlogPost(slug: string): Promise<unknown> {
    return this.request("GET", `/blog/${encodeURIComponent(slug)}`);
  }

  /**
   * Create a new blog draft article
   */
  async createBlogDraft(data: CreateBlogDraftInput): Promise<unknown> {
    const summary =
      data.seoDescription ||
      (data.body.length > 160 ? `${data.body.slice(0, 157)}...` : data.body) ||
      data.title;

    return this.request("POST", "/blog", {
      body: {
        title: data.title,
        slug: data.slug,
        content: data.body,
        summary,
        status: "draft",
        metaDescription: data.seoDescription,
        tags: data.tags,
      },
    });
  }

  /**
   * List all configured forms in the CMS
   */
  async listForms(): Promise<unknown> {
    return this.request("GET", "/forms");
  }

  /**
   * Retrieve form submissions for a specific form
   */
  async getFormSubmissions(formId: string, limit?: number): Promise<unknown> {
    return this.request("GET", `/forms/${encodeURIComponent(formId)}/submissions`, {
      params: { limit },
    });
  }

  /**
   * List uploaded media assets
   */
  async listMedia(limit?: number): Promise<unknown> {
    return this.request("GET", "/media", {
      params: { limit },
    });
  }
}

/**
 * Default singleton instance configured from environment variables
 */
export const cmsApiClient = new CmsApiClient();
