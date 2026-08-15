import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "./errors/AppError.js";
import { assertUniqueSlug, generateSlug, searchPaginated } from "./slugUtils.js";
import type { ICollection } from "./types/IDatabase.js";

function makeMockCollection<T extends Record<string, unknown>>(
  initialDocs: T[] = [],
): ICollection<T> {
  const docs = [...initialDocs];

  return {
    async insertOne(doc: Record<string, unknown>): Promise<void> {
      docs.push(structuredClone(doc as T));
    },
    async findOne(filter: Record<string, unknown>): Promise<T | null> {
      const match = docs.find((d) => Object.entries(filter).every(([k, v]) => d[k] === v));
      return match ? structuredClone(match) : null;
    },
    async find(
      filter: Record<string, unknown> = {},
      options?: { skip?: number; limit?: number },
    ): Promise<T[]> {
      let res = docs.filter((d) => {
        if (filter["$text"] && typeof filter["$text"] === "object") {
          const search = String((filter["$text"] as { $search: string }).$search).toLowerCase();
          return Object.values(d).some(
            (v) => typeof v === "string" && v.toLowerCase().includes(search),
          );
        }
        return Object.entries(filter).every(([k, v]) => d[k] === v);
      });
      if (options?.skip) res = res.slice(options.skip);
      if (options?.limit) res = res.slice(0, options.limit);
      return res.map((d) => structuredClone(d));
    },
    async updateOne(): Promise<void> {},
    async deleteOne(): Promise<void> {},
    async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
      if (filter["$text"] && typeof filter["$text"] === "object") {
        const search = String((filter["$text"] as { $search: string }).$search).toLowerCase();
        return docs.filter((d) =>
          Object.values(d).some((v) => typeof v === "string" && v.toLowerCase().includes(search)),
        ).length;
      }
      return docs.length;
    },
    async createIndex(): Promise<void> {},
  };
}

describe("slugUtils", () => {
  it("generateSlug converts text, handles Turkish characters and cleans dashes", () => {
    assert.equal(generateSlug("Hakkımızda & Vizyon"), "hakkimizda-vizyon");
    assert.equal(generateSlug("Şık ve Güzel Çağdaş Tasarım!"), "sik-ve-guzel-cagdas-tasarim");
    assert.equal(generateSlug("   --- Çoklu   Boşluklar --- "), "coklu-bosluklar");
    assert.equal(generateSlug(""), "untitled");
    assert.equal(generateSlug("!!!@@@###"), "untitled");
  });

  it("assertUniqueSlug passes when slug is unused or matches excludeId", async () => {
    const col = makeMockCollection([{ id: "page-1", slug: "about-us" }]);
    await assert.doesNotThrow(() => assertUniqueSlug(col, "contact-us"));
    await assert.doesNotThrow(() => assertUniqueSlug(col, "about-us", "page-1"));
  });

  it("assertUniqueSlug throws ValidationError when slug is taken by another record", async () => {
    const col = makeMockCollection([{ id: "page-1", slug: "about-us" }]);
    await assert.rejects(() => assertUniqueSlug(col, "about-us", "page-2"), ValidationError);
  });

  it("searchPaginated returns paginated search results", async () => {
    const col = makeMockCollection([
      { id: "1", title: "About Company", status: "published" },
      { id: "2", title: "Products & Pricing", status: "published" },
      { id: "3", title: "Privacy Policy", status: "published" },
    ]);

    const result = await searchPaginated(col, "Pricing", { page: 1, limit: 10 });
    assert.equal(result.meta.total, 1);
    assert.equal(result.data[0]?.title, "Products & Pricing");
  });
});
