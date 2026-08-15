import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LogService } from "./LogService.js";

function makeCapturingLogger(): {
  logger: LogService;
  lines: () => string[];
  entries: () => Array<Record<string, unknown>>;
} {
  const raw: string[] = [];
  const original = process.stdout.write.bind(process.stdout);

  const logger = new LogService("debug");

  const intercepted = (chunk: unknown): boolean => {
    if (typeof chunk === "string") raw.push(chunk);
    return true;
  };

  process.stdout.write = intercepted as typeof process.stdout.write;

  return {
    logger,
    lines: () => {
      process.stdout.write = original;
      return raw.flatMap((r) => r.split("\n").filter(Boolean));
    },
    entries: () => {
      process.stdout.write = original;
      return raw
        .flatMap((r) => r.split("\n").filter(Boolean))
        .map((l) => JSON.parse(l) as Record<string, unknown>);
    },
  };
}

describe("LogService", () => {
  it("writes structured JSON with level, time, and msg", () => {
    const { logger, entries } = makeCapturingLogger();
    logger.info("hello world");
    const parsed = entries();
    assert.equal(parsed.length, 1);
    const entry = parsed[0];
    assert.ok(entry !== undefined);
    assert.equal(entry["level"], "info");
    assert.equal(entry["msg"], "hello world");
    assert.ok(typeof entry["time"] === "string");
  });

  it("respects minimum log level — debug suppressed at info level", () => {
    const captured: string[] = [];
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((c: unknown) => {
      if (typeof c === "string") captured.push(c);
      return true;
    }) as typeof process.stdout.write;

    const logger = new LogService("info");
    logger.debug("should be suppressed");
    logger.info("should appear");
    process.stdout.write = original;

    const lines = captured.flatMap((c) => c.split("\n").filter(Boolean));
    assert.equal(lines.length, 1);
    const entry = JSON.parse(lines[0]!) as Record<string, unknown>;
    assert.equal(entry["level"], "info");
  });

  it("redacts sensitive fields (Rule 36)", () => {
    const { logger, entries } = makeCapturingLogger();
    logger.info("user action", {
      email: "user@example.com",
      password: "supersecret",
      token: "eyJ...",
      authorization: "Bearer xyz",
      cookie: "session=abc",
    });
    const entry = entries()[0];
    assert.ok(entry !== undefined);
    assert.equal(entry["email"], "user@example.com");
    assert.equal(entry["password"], "[REDACTED]");
    assert.equal(entry["token"], "[REDACTED]");
    assert.equal(entry["authorization"], "[REDACTED]");
    assert.equal(entry["cookie"], "[REDACTED]");
  });

  it("redacts case-insensitively", () => {
    const { logger, entries } = makeCapturingLogger();
    logger.info("test", { Password: "secret", JWT: "token", AccessToken: "at" });
    const entry = entries()[0];
    assert.ok(entry !== undefined);
    assert.equal(entry["Password"], "[REDACTED]");
    assert.equal(entry["JWT"], "[REDACTED]");
    assert.equal(entry["AccessToken"], "[REDACTED]");
  });

  it("emits all four log levels", () => {
    const { logger, entries } = makeCapturingLogger();
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    const levels = entries().map((e) => e["level"]);
    assert.deepEqual(levels, ["debug", "info", "warn", "error"]);
  });
});
