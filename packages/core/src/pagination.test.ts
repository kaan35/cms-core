import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "./errors/AppError.js";
import { buildPaginatedResult, parsePaginationQuery } from "./pagination.js";

describe("parsePaginationQuery", () => {
  it("defaults to page 1, limit 20 when query is empty", () => {
    assert.deepEqual(parsePaginationQuery({}), { page: 1, limit: 20 });
  });

  it("parses valid page and limit strings", () => {
    assert.deepEqual(parsePaginationQuery({ page: "3", limit: "50" }), { page: 3, limit: 50 });
  });

  it("parses numeric values directly", () => {
    assert.deepEqual(parsePaginationQuery({ page: 2, limit: 10 }), { page: 2, limit: 10 });
  });

  it("throws ValidationError for page < 1", () => {
    assert.throws(() => parsePaginationQuery({ page: "0" }), ValidationError);
  });

  it("throws ValidationError for negative page", () => {
    assert.throws(() => parsePaginationQuery({ page: "-1" }), ValidationError);
  });

  it("throws ValidationError for limit > 100", () => {
    assert.throws(() => parsePaginationQuery({ limit: "101" }), ValidationError);
  });

  it("throws ValidationError for limit < 1", () => {
    assert.throws(() => parsePaginationQuery({ limit: "0" }), ValidationError);
  });

  it("throws ValidationError for non-integer page", () => {
    assert.throws(() => parsePaginationQuery({ page: "1.5" }), ValidationError);
  });

  it("handles null/non-object query gracefully — uses defaults", () => {
    assert.deepEqual(parsePaginationQuery(null), { page: 1, limit: 20 });
    assert.deepEqual(parsePaginationQuery(undefined), { page: 1, limit: 20 });
  });
});

describe("buildPaginatedResult", () => {
  it("calculates totalPages correctly", () => {
    const result = buildPaginatedResult(["a", "b"], 25, 1, 10);
    assert.equal(result.meta.totalPages, 3);
    assert.equal(result.meta.total, 25);
    assert.deepEqual(result.data, ["a", "b"]);
  });

  it("totalPages rounds up", () => {
    const result = buildPaginatedResult([], 21, 1, 10);
    assert.equal(result.meta.totalPages, 3);
  });
});
