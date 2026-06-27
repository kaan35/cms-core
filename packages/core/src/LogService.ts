import pino from "pino";
import { config } from "./ConfigService.ts";

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: ["development", "test"].includes(config.NODE_ENV)
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});
