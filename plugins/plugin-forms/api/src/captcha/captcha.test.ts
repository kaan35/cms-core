import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ChallengeCaptchaProvider,
  generateChallenge,
  verifyChallenge,
} from "./challengeProvider.js";
import { CaptchaRegistry } from "./registry.js";

const TEST_CAPTCHA_SECRET = "test-captcha-secret-key-32-chars-minimum";

describe("challenge captcha", () => {
  it("enforces fail-closed secret validation (<32 chars or missing throws)", () => {
    const originalEnv = process.env["CAPTCHA_SECRET"];
    delete process.env["CAPTCHA_SECRET"];
    try {
      assert.throws(
        () => generateChallenge("alphanumeric", ""),
        /CAPTCHA_SECRET is required and must be at least 32 characters long/,
      );
      assert.throws(
        () => generateChallenge("alphanumeric", "too-short"),
        /CAPTCHA_SECRET is required and must be at least 32 characters long/,
      );
      assert.throws(
        () => new ChallengeCaptchaProvider("too-short"),
        /CAPTCHA_SECRET is required and must be at least 32 characters long/,
      );
      assert.throws(
        () => new CaptchaRegistry("too-short"),
        /CAPTCHA_SECRET is required and must be at least 32 characters long/,
      );
    } finally {
      if (originalEnv !== undefined) {
        process.env["CAPTCHA_SECRET"] = originalEnv;
      } else {
        delete process.env["CAPTCHA_SECRET"];
      }
    }
  });

  it("generates and verifies valid alphanumeric challenge", () => {
    const challenge = generateChallenge("alphanumeric", TEST_CAPTCHA_SECRET);
    assert.ok(challenge.captchaToken);
    assert.equal(challenge.challengeType, "alphanumeric");
    assert.ok(challenge.question.startsWith("Enter code: "));

    const code = challenge.question.replace("Enter code: ", "");

    // Correct answer (case-insensitive)
    assert.equal(
      verifyChallenge(challenge.captchaToken, code.toUpperCase(), TEST_CAPTCHA_SECRET),
      true,
    );

    // Incorrect answer
    assert.equal(verifyChallenge(challenge.captchaToken, "wrong", TEST_CAPTCHA_SECRET), false);

    // Tampered token
    assert.equal(verifyChallenge("tampered.token", code, TEST_CAPTCHA_SECRET), false);
  });

  it("generates and verifies valid math challenge", () => {
    const challenge = generateChallenge("math", TEST_CAPTCHA_SECRET);
    assert.ok(challenge.captchaToken);
    assert.equal(challenge.challengeType, "math");
    assert.ok(challenge.question.includes("="));

    // Parse question expression
    const [expr] = challenge.question.split("=");
    const parts = expr!.trim().split(" ");
    const a = Number(parts[0]);
    const op = parts[1];
    const b = Number(parts[2]);

    let expected = 0;
    if (op === "+") expected = a + b;
    else if (op === "-") expected = a - b;
    else if (op === "*") expected = a * b;

    assert.equal(
      verifyChallenge(challenge.captchaToken, String(expected), TEST_CAPTCHA_SECRET),
      true,
    );
    assert.equal(
      verifyChallenge(challenge.captchaToken, String(expected + 1), TEST_CAPTCHA_SECRET),
      false,
    );
  });

  it("CaptchaRegistry resolves none and challenge providers", async () => {
    const registry = new CaptchaRegistry(TEST_CAPTCHA_SECRET);

    const noneProvider = registry.getRequired("none");
    const resNone = await noneProvider.verify({});
    assert.equal(resNone.passed, true);

    const challengeProvider = registry.getRequired("challenge");
    assert.ok(challengeProvider instanceof ChallengeCaptchaProvider);

    const challenge = generateChallenge("alphanumeric", TEST_CAPTCHA_SECRET);
    const code = challenge.question.replace("Enter code: ", "");

    const passRes = await challengeProvider.verify({
      captchaToken: challenge.captchaToken,
      captchaAnswer: code,
    });
    assert.equal(passRes.passed, true);

    const failRes = await challengeProvider.verify({
      captchaToken: challenge.captchaToken,
      captchaAnswer: "wrongcode",
    });
    assert.equal(failRes.passed, false);
    assert.ok(failRes.error);
  });
});
