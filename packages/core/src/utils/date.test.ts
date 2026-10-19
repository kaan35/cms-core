import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDateSearchFormatters,
  formatDate,
  formatDateTime,
  matchesDateSearch,
} from "./date.js";

describe("date utils", () => {
  const testDate = new Date("2026-10-18T21:44:00.000Z");

  it("formats date and date-time cleanly with timezone support", () => {
    const formattedDate = formatDate(testDate, { timeZone: "Europe/Istanbul" });
    assert.equal(formattedDate, "Oct 19, 2026");

    const formattedTime12 = formatDateTime(testDate, {
      timeZone: "Europe/Istanbul",
      hour12: true,
    });
    assert.equal(formattedTime12, "Oct 19, 2026, 12:44 AM");

    const formattedTime24 = formatDateTime(testDate, {
      timeZone: "Europe/Istanbul",
      hour12: false,
    });
    assert.equal(formattedTime24, "Oct 19, 2026, 00:44");
  });

  it("handles null/undefined gracefully", () => {
    assert.equal(formatDate(null), "—");
    assert.equal(formatDateTime(undefined), "—");
    assert.equal(matchesDateSearch(null, "2026"), false);
  });

  it("matches date search in 12h, 24h, date, and ISO representations", () => {
    const formatters = createDateSearchFormatters("Europe/Istanbul");

    assert.equal(matchesDateSearch(testDate, "12:44", formatters), true);
    assert.equal(matchesDateSearch(testDate, "12:44 AM", formatters), true);
    assert.equal(matchesDateSearch(testDate, "00:44", formatters), true);
    assert.equal(matchesDateSearch(testDate, "Oct 19", formatters), true);
    assert.equal(matchesDateSearch(testDate, "2026-10-18", formatters), true);
    assert.equal(matchesDateSearch(testDate, "nonexistent", formatters), false);
  });
});
