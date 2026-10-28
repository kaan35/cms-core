import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateHexColor } from "./system.rules.js";

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
});
