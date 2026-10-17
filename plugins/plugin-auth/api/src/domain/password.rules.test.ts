import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, validatePasswordStrength, verifyPassword } from "./password.rules.js";

describe("password.rules", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const res = validatePasswordStrength("Pass1");
    assert.equal(res.valid, false);
    assert.match(res.error ?? "", /at least 8 characters/);
  });

  it("rejects passwords without numbers", () => {
    const res = validatePasswordStrength("PasswordOnly");
    assert.equal(res.valid, false);
    assert.match(res.error ?? "", /contain both letters and numbers/);
  });

  it("rejects passwords without letters", () => {
    const res = validatePasswordStrength("123456789");
    assert.equal(res.valid, false);
    assert.match(res.error ?? "", /contain both letters and numbers/);
  });

  it("accepts valid passwords", () => {
    const res = validatePasswordStrength("Secret123!");
    assert.equal(res.valid, true);
  });

  it("hashes and verifies password correctly", async () => {
    const plain = "StrongPassword123";
    const hash = await hashPassword(plain);
    assert.ok(hash !== plain);
    assert.equal(await verifyPassword(plain, hash), true);
    assert.equal(await verifyPassword("WrongPass123", hash), false);
  });

  it("rejects passwords exceeding 72 UTF-8 bytes including 50000-char DoS payloads", async () => {
    const hugePassword = "A1" + "a".repeat(50000);
    const res = validatePasswordStrength(hugePassword);
    assert.equal(res.valid, false);
    assert.match(res.error ?? "", /must not exceed 72 bytes/);

    await assert.rejects(() => hashPassword(hugePassword), /must not exceed 72 bytes/);

    const validHash = await hashPassword("StrongPassword123", 4);
    assert.equal(await verifyPassword(hugePassword, validHash), false);
  });
});
