import type { CoreServices } from "@cms/core";
import type { FastifyInstance } from "fastify";
import { CaptchaRegistry } from "./captcha/registry.js";
import { FormsController } from "./formsController.js";
import { FormsService } from "./formsService.js";
import { FormsRepository } from "./repositories/formsRepository.js";

export * from "./captcha/captchaProvider.js";
export * from "./captcha/challengeProvider.js";
export * from "./captcha/registry.js";
export * from "./domain/form.rules.js";
export * from "./formsController.js";
export * from "./formsService.js";
export { initFormsMigration } from "./migrations/202601060000_init_forms.js";
export * from "./repositories/formsRepository.js";

export async function registerFormsPlugin(
  app: FastifyInstance,
  services: CoreServices,
): Promise<void> {
  const { db, logger, hooks, config } = services;
  const captchaSecret = config?.getOrDefault("CAPTCHA_SECRET", "") || "";
  if (!captchaSecret || captchaSecret.length < 32) {
    throw new Error(
      "CAPTCHA_SECRET is required and must be at least 32 characters long. Boot failed.",
    );
  }
  const captchaMaxAgeMs = (config?.getInt("CAPTCHA_MAX_AGE_SECONDS", 600) ?? 600) * 1000;

  const repo = new FormsRepository(db);
  const captchaRegistry = new CaptchaRegistry(captchaSecret, captchaMaxAgeMs);
  const service = new FormsService(repo, captchaRegistry, hooks, logger);
  const controller = new FormsController(service);

  const { registerFormsRoutes } = await import("./routes.js");
  registerFormsRoutes(app, controller);
}
