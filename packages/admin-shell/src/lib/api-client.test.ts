import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  api,
  ApiError,
  appendQueryParams,
  isExternalUrl,
  request,
  resolveRequestUrl,
} from "./api-client";

describe("API Client URL & Parameter Resolution", () => {
  describe("isExternalUrl", () => {
    it("identifies local and relative endpoints as internal", () => {
      assert.equal(isExternalUrl("/users"), false);
      assert.equal(isExternalUrl("/api/users"), false);
      assert.equal(isExternalUrl("users"), false);
    });

    it("identifies third-party URLs as external", () => {
      assert.equal(isExternalUrl("https://api.stripe.com/v1/charges"), true);
      assert.equal(isExternalUrl("https://vercel.com/api"), true);
      assert.equal(isExternalUrl("http://external-service.org/ping"), true);
    });
  });

  describe("resolveRequestUrl", () => {
    it("automatically adds /api prefix to internal endpoints", () => {
      const res1 = resolveRequestUrl("/users");
      assert.equal(res1.url, "/api/users");
      assert.equal(res1.isExternal, false);

      const res2 = resolveRequestUrl("users");
      assert.equal(res2.url, "/api/users");
      assert.equal(res2.isExternal, false);
    });

    it("is idempotent and never duplicates /api prefix", () => {
      const res = resolveRequestUrl("/api/users");
      assert.equal(res.url, "/api/users");
      assert.equal(res.isExternal, false);
    });

    it("preserves external URLs unmodified", () => {
      const externalUrl = "https://api.github.com/user";
      const res = resolveRequestUrl(externalUrl);
      assert.equal(res.url, externalUrl);
      assert.equal(res.isExternal, true);
    });

    it("strips /api when baseUrl is direct backend HTTP server", () => {
      const res = resolveRequestUrl("/api/users", "http://localhost:3001");
      assert.equal(res.url, "http://localhost:3001/users");
      assert.equal(res.isExternal, false);
    });
  });

  describe("appendQueryParams", () => {
    it("appends scalar query parameters", () => {
      const url = appendQueryParams("/api/users", { page: 1, limit: 20 });
      assert.equal(url, "/api/users?page=1&limit=20");
    });

    it("supports array query parameters", () => {
      const url = appendQueryParams("/api/items", { tag: ["tech", "news"] });
      assert.equal(url, "/api/items?tag=tech&tag=news");
    });

    it("ignores null, undefined, and empty string parameters", () => {
      const url = appendQueryParams("/api/items", {
        search: "",
        category: null,
        sort: undefined,
        active: true,
      });
      assert.equal(url, "/api/items?active=true");
    });

    it("correctly appends to URLs that already have query strings", () => {
      const url = appendQueryParams("/api/items?sort=desc", { page: 2 });
      assert.equal(url, "/api/items?sort=desc&page=2");
    });
  });

  describe("Request Execution & Isolation", () => {
    it("request.api references the same client as api", () => {
      assert.equal(request.api, api);
    });

    it("times out and throws ApiError with status 408 on timeout", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = ((_url: string, init?: RequestInit) => {
          return new Promise((_resolve, reject) => {
            if (init?.signal) {
              init.signal.addEventListener("abort", () => {
                const err = new Error("Aborted");
                err.name = "AbortError";
                reject(err);
              });
            }
          });
        }) as typeof fetch;

        await assert.rejects(
          async () => {
            await api.get("/slow-endpoint", { timeout: 10 });
          },
          (err: unknown) => {
            assert.ok(err instanceof ApiError);
            assert.equal((err as ApiError).status, 408);
            assert.equal((err as ApiError).code, "TIMEOUT");
            return true;
          },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("does not leak CSRF token or session credentials to external endpoints", async () => {
      const originalFetch = globalThis.fetch;
      let capturedHeaders: Record<string, string> = {};
      let capturedCredentials: string | undefined;

      try {
        globalThis.fetch = (async (_url: string, init?: RequestInit) => {
          capturedHeaders = (init?.headers || {}) as Record<string, string>;
          capturedCredentials = init?.credentials;
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }) as typeof fetch;

        await api.post("https://thirdparty.com/webhook", { data: 123 });

        assert.equal(capturedHeaders["x-csrf-token"], undefined);
        assert.equal(capturedCredentials, "same-origin");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
