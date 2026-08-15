import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateFeatureFlagKey, validateHexColor } from "./system.rules.js";

describe("system.rules", () => {
  it("validateHexColor accepts valid 3 and 6 char hex colors", () => {
    assert.equal(validateHexColor("#fff"), true);
    assert.equal(validateHexColor("#FFF"), true);
    assert.equal(validateHexColor("#ffffff"), true);
    assert.equal(validateHexColor("#123456"), true);
    assert.equal(validateHexColor("#4f46e5"), true);
  });

  it("validateHexColor rejects invalid hex strings", () => {
    assert.equal(validateHexColor("red"), false);
    assert.equal(validateHexColor("#ffff"), false);
    assert.equal(validateHexColor("123456"), false);
    assert.equal(validateHexColor("#gggggg"), false);
    assert.equal(validateHexColor(""), false);
  });

  it("validateFeatureFlagKey validates key constraints", () => {
    assert.equal(validateFeatureFlagKey("dark_mode"), true);
    assert.equal(validateFeatureFlagKey("scrollAnimations"), true);
    assert.equal(validateFeatureFlagKey("v2.beta-feature"), true);

    assert.equal(validateFeatureFlagKey("a"), false);
    assert.equal(validateFeatureFlagKey("invalid key with spaces"), false);
    assert.equal(validateFeatureFlagKey("invalid$symbol"), false);
  });
});
