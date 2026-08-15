import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import process from "node:process";
import type { CaptchaVerifyResult, ICaptchaProvider } from "./captchaProvider.js";

const DEFAULT_SECRET = process.env["CAPTCHA_SECRET"] || "cms-challenge-secret-salt-2026";
const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

const SAFE_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";

export interface ChallengeData {
  captchaToken: string;
  challengeType: "alphanumeric" | "math";
  question: string;
}

export function generateChallenge(
  challengeType: "alphanumeric" | "math" = "alphanumeric",
  secret = DEFAULT_SECRET,
): ChallengeData {
  const timestamp = Date.now();
  let question: string;
  let answer: string;

  if (challengeType === "math") {
    const ops = ["+", "-", "*"] as const;
    const op = ops[Math.floor(Math.random() * ops.length)]!;

    if (op === "+") {
      const a = Math.floor(Math.random() * 800) + 100;
      const b = Math.floor(Math.random() * 800) + 100;
      question = `${a} + ${b} = ?`;
      answer = String(a + b);
    } else if (op === "-") {
      const a = Math.floor(Math.random() * 500) + 500;
      const b = Math.floor(Math.random() * 400) + 50;
      question = `${a} - ${b} = ?`;
      answer = String(a - b);
    } else {
      const a = Math.floor(Math.random() * 40) + 10;
      const b = Math.floor(Math.random() * 8) + 2;
      question = `${a} * ${b} = ?`;
      answer = String(a * b);
    }
  } else {
    const len = 5;
    const bytes = randomBytes(len);
    let code = "";
    for (let i = 0; i < len; i++) {
      code += SAFE_CHARS[bytes[i]! % SAFE_CHARS.length];
    }
    question = `Enter code: ${code}`;
    answer = code.toLowerCase();
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(`${timestamp}:${answer.toLowerCase()}`);
  const signature = hmac.digest("hex");
  const captchaToken = `${timestamp}.${signature}`;

  return {
    captchaToken,
    challengeType,
    question,
  };
}

export function verifyChallenge(
  token: string,
  userAnswer: string,
  secret = DEFAULT_SECRET,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): boolean {
  if (!token || !userAnswer || typeof token !== "string" || typeof userAnswer !== "string") {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [tsStr, signature] = parts;
  const timestamp = Number(tsStr);
  if (isNaN(timestamp) || !signature) {
    return false;
  }

  const now = Date.now();
  if (now - timestamp > maxAgeMs || timestamp > now + 60000) {
    return false;
  }

  const cleanAnswer = userAnswer.trim().toLowerCase();
  const hmac = createHmac("sha256", secret);
  hmac.update(`${timestamp}:${cleanAnswer}`);
  const expectedSignature = hmac.digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");
    if (sigBuf.length !== expBuf.length) {
      return false;
    }
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export class ChallengeCaptchaProvider implements ICaptchaProvider {
  readonly id = "challenge";

  private secret: string;
  private maxAgeMs: number;

  constructor(secret = DEFAULT_SECRET, maxAgeMs = DEFAULT_MAX_AGE_MS) {
    this.secret = secret;
    this.maxAgeMs = maxAgeMs;
  }

  generate(challengeType: "alphanumeric" | "math" = "alphanumeric"): ChallengeData {
    return generateChallenge(challengeType, this.secret);
  }

  async verify(data: Record<string, unknown>): Promise<CaptchaVerifyResult> {
    const token = data["captchaToken"];
    const answer = data["captchaAnswer"];

    if (!token || typeof token !== "string") {
      return {
        passed: false,
        onFailure: "error",
        error: "Missing captcha token",
      };
    }

    if (!answer || typeof answer !== "string") {
      return {
        passed: false,
        onFailure: "error",
        error: "Missing captcha answer",
      };
    }

    const isValid = verifyChallenge(token, answer, this.secret, this.maxAgeMs);
    if (!isValid) {
      return {
        passed: false,
        onFailure: "error",
        error: "Incorrect captcha answer or captcha token expired",
      };
    }

    return {
      passed: true,
      onFailure: "error",
    };
  }
}
