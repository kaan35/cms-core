import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError, createApiClient } from "./api";

describe("Client SDK API Client", () => {
  it("resolves media URLs and sanitizes against XSS attacks", () => {
    const client = createApiClient({ baseUrl: "https://cms.example.com" });

    // Valid paths
    assert.equal(
      client.media.resolveUrl("image123"),
      "https://cms.example.com/media/file/image123",
    );
    assert.equal(
      client.media.resolveUrl("https://cdn.example.com/pic.jpg"),
      "https://cdn.example.com/pic.jpg",
    );
    assert.equal(client.media.resolveUrl("/uploads/pic.png"), "/uploads/pic.png");

    // Safe base64 image data URIs
    const safeData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
    assert.equal(client.media.resolveUrl(safeData), safeData);

    // XSS attacks blocked
    assert.equal(client.media.resolveUrl("javascript:alert(1)"), undefined);
    assert.equal(client.media.resolveUrl("vbscript:msgbox(1)"), undefined);
    assert.equal(
      client.media.resolveUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="),
      undefined,
    );
  });

  it("handles array query parameters properly", async () => {
    let capturedUrl = "";
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (url: string | URL | Request) => {
        capturedUrl = String(url);
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      const client = createApiClient({ baseUrl: "https://cms.example.com" });
      await client.get("/posts", {
        params: {
          tag: ["tech", "ai"],
          status: "published",
          empty: undefined,
        },
      });

      assert.ok(capturedUrl.includes("tag=tech&tag=ai"));
      assert.ok(capturedUrl.includes("status=published"));
      assert.ok(!capturedUrl.includes("empty"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("aborts when request times out", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => {
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

      const client = createApiClient({ baseUrl: "https://cms.example.com", timeout: 15 });

      await assert.rejects(
        async () => {
          await client.get("/slow-query");
        },
        (err: unknown) => {
          assert.ok(err instanceof ApiError);
          assert.equal((err as ApiError).status, 408);
          return true;
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
