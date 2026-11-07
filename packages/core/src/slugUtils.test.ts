import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "./errors/AppError.js";
import { assertUniqueSlug, generateSlug, searchPaginated } from "./slugUtils.js";
import { InMemoryCollection } from "./testing/index.js";

describe("slugUtils", () => {
  it("generateSlug converts text, handles Turkish characters and cleans dashes", () => {
    assert.equal(generateSlug("Hakkımızda & Vizyon"), "hakkimizda-vizyon");
    assert.equal(generateSlug("Şık ve Güzel Çağdaş Tasarım!"), "sik-ve-guzel-cagdas-tasarim");
    assert.equal(generateSlug("   --- Çoklu   Boşluklar --- "), "coklu-bosluklar");
    assert.equal(generateSlug(""), "untitled");
    assert.equal(generateSlug("!!!@@@###"), "untitled");
  });

  it("assertUniqueSlug passes when slug is unused or matches excludeId", async () => {
    const col = new InMemoryCollection([{ id: "page-1", slug: "about-us" }]);
    await assert.doesNotThrow(() => assertUniqueSlug(col, "contact-us"));
    await assert.doesNotThrow(() => assertUniqueSlug(col, "about-us", "page-1"));
  });

  it("assertUniqueSlug throws ValidationError when slug is taken by another record", async () => {
    const col = new InMemoryCollection([{ id: "page-1", slug: "about-us" }]);
    await assert.rejects(() => assertUniqueSlug(col, "about-us", "page-2"), ValidationError);
  });

  it("searchPaginated returns paginated search results", async () => {
    const col = new InMemoryCollection([
      { id: "1", title: "About Company", status: "published" },
      { id: "2", title: "Products & Pricing", status: "published" },
      { id: "3", title: "Privacy Policy", status: "published" },
    ]);

    const result = await searchPaginated(col, "Pricing", { page: 1, limit: 10 });
    assert.equal(result.meta.total, 1);
    assert.equal(result.data[0]?.title, "Products & Pricing");
  });
});
