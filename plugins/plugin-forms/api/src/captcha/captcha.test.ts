import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ChallengeCaptchaProvider,
  generateChallenge,
  verifyChallenge,
} from "./challengeProvider.js";
import { CaptchaRegistry } from "./registry.js";

describe("challenge captcha", () => {
  it("generates and verifies valid alphanumeric challenge", () => {
    const challenge = generateChallenge("alphanumeric", "test-secret");
    assert.ok(challenge.captchaToken);
    assert.equal(challenge.challengeType, "alphanumeric");
    assert.ok(challenge.question.startsWith("Enter code: "));

    const code = challenge.question.replace("Enter code: ", "");

    // Correct answer (case-insensitive)
    assert.equal(verifyChallenge(challenge.captchaToken, code.toUpperCase(), "test-secret"), true);

    // Incorrect answer
    assert.equal(verifyChallenge(challenge.captchaToken, "wrong", "test-secret"), false);

    // Tampered token
    assert.equal(verifyChallenge("tampered.token", code, "test-secret"), false);
  });

  it("generates and verifies valid math challenge", () => {
    const challenge = generateChallenge("math", "test-secret");
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

    assert.equal(verifyChallenge(challenge.captchaToken, String(expected), "test-secret"), true);
    assert.equal(
      verifyChallenge(challenge.captchaToken, String(expected + 1), "test-secret"),
      false,
    );
  });

  it("CaptchaRegistry resolves none and challenge providers", async () => {
    const registry = new CaptchaRegistry("test-secret");

    const noneProvider = registry.getRequired("none");
    const resNone = await noneProvider.verify({});
    assert.equal(resNone.passed, true);

    const challengeProvider = registry.getRequired("challenge");
    assert.ok(challengeProvider instanceof ChallengeCaptchaProvider);

    const challenge = generateChallenge("alphanumeric", "test-secret");
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
