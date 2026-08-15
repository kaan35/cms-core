import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ConfigService } from "./ConfigService.js";

describe("ConfigService", () => {
  describe("get()", () => {
    it("returns the value when present", () => {
      const cfg = new ConfigService({ KEY: "value" });
      assert.equal(cfg.get("KEY"), "value");
    });

    it("throws when the variable is missing", () => {
      const cfg = new ConfigService({});
      assert.throws(() => cfg.get("MISSING"), /Missing required environment variable: MISSING/);
    });

    it("throws when the variable is an empty string", () => {
      const cfg = new ConfigService({ KEY: "" });
      assert.throws(() => cfg.get("KEY"), /Missing required environment variable: KEY/);
    });
  });

  describe("getOrDefault()", () => {
    it("returns the value when present", () => {
      const cfg = new ConfigService({ KEY: "real" });
      assert.equal(cfg.getOrDefault("KEY", "fallback"), "real");
    });

    it("returns the default when missing", () => {
      const cfg = new ConfigService({});
      assert.equal(cfg.getOrDefault("MISSING", "fallback"), "fallback");
    });

    it("returns the default when empty string", () => {
      const cfg = new ConfigService({ KEY: "" });
      assert.equal(cfg.getOrDefault("KEY", "fallback"), "fallback");
    });
  });

  describe("getBoolean()", () => {
    it('returns true for "true"', () => {
      const cfg = new ConfigService({ FLAG: "true" });
      assert.equal(cfg.getBoolean("FLAG"), true);
    });

    it('returns true for "1"', () => {
      const cfg = new ConfigService({ FLAG: "1" });
      assert.equal(cfg.getBoolean("FLAG"), true);
    });

    it('returns false for "false"', () => {
      const cfg = new ConfigService({ FLAG: "false" });
      assert.equal(cfg.getBoolean("FLAG"), false);
    });

    it("returns default when missing", () => {
      const cfg = new ConfigService({});
      assert.equal(cfg.getBoolean("FLAG", true), true);
    });
  });

  describe("getInt()", () => {
    it("parses a valid integer", () => {
      const cfg = new ConfigService({ PORT: "3000" });
      assert.equal(cfg.getInt("PORT", 8080), 3000);
    });

    it("returns default on NaN", () => {
      const cfg = new ConfigService({ PORT: "abc" });
      assert.equal(cfg.getInt("PORT", 8080), 8080);
    });

    it("returns default when missing", () => {
      const cfg = new ConfigService({});
      assert.equal(cfg.getInt("PORT", 8080), 8080);
    });
  });
});
