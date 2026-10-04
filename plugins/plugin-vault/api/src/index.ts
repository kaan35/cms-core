import type { CoreServices } from "@cms/core";
import type { FastifyInstance } from "fastify";
import { VaultController } from "./controllers/vaultController.js";
import { VaultRepository } from "./repositories/vaultRepository.js";
import { registerVaultRoutes } from "./routes.js";
import { VaultService } from "./services/vaultService.js";

export * from "./controllers/vaultController.js";
export * from "./domain/vault.rules.js";
export { initVaultMigration } from "./migrations/202601070000_init_vault.js";
export * from "./repositories/vaultRepository.js";
export * from "./routes.js";
export * from "./services/vaultService.js";

export async function registerVaultPlugin(
  app: FastifyInstance,
  services: CoreServices,
): Promise<void> {
  const { db, logger, hooks, config } = services;
  const vaultSecret =
    config?.getOrDefault("VAULT_SECRET", "") ||
    process.env["VAULT_SECRET"] ||
    "";

  if (!vaultSecret || vaultSecret.length < 32) {
    throw new Error(
      "VAULT_SECRET is required and must be at least 32 characters long. Boot failed.",
    );
  }

  const repo = new VaultRepository(db);
  const service = new VaultService(repo, hooks, logger, vaultSecret);
  const controller = new VaultController(service);

  registerVaultRoutes(app, controller);
}
