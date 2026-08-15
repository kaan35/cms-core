import type { ILogger } from "../types/ILogger.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "jwt",
  "secret",
  "authorization",
  "cookie",
]);

function redact(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : value;
  }
  return result;
}

export class LogService implements ILogger {
  private readonly minLevelRank: number;

  constructor(level: LogLevel = "info") {
    this.minLevelRank = LEVEL_RANK[level];
  }

  private write(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (LEVEL_RANK[level] < this.minLevelRank) return;

    const entry: Record<string, unknown> = {
      level,
      time: new Date().toISOString(),
      msg,
    };

    if (data !== undefined) {
      Object.assign(entry, redact(data));
    }

    process.stdout.write(JSON.stringify(entry) + "\n");
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    this.write("debug", msg, data);
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.write("info", msg, data);
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.write("warn", msg, data);
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.write("error", msg, data);
  }
}

export const stubLogger: ILogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};
