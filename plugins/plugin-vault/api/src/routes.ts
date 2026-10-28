import { PERMISSIONS } from "@cms/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { VaultController } from "./controllers/vaultController.js";

export function registerVaultRoutes(app: FastifyInstance, controller: VaultController): void {
  const customApp = app as unknown as {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyCsrf: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    checkPermission?: (
      permission: string,
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  };

  const authenticate = (req: FastifyRequest, reply: FastifyReply) =>
    customApp.authenticate ? customApp.authenticate(req, reply) : Promise.resolve();
  const verifyCsrf = (req: FastifyRequest, reply: FastifyReply) =>
    customApp.verifyCsrf ? customApp.verifyCsrf(req, reply) : Promise.resolve();
  const checkPermission = (permission: string) => (req: FastifyRequest, reply: FastifyReply) =>
    customApp.checkPermission
      ? customApp.checkPermission(permission)(req, reply)
      : Promise.resolve();

  // List vault credentials
  app.get(
    "/vault/items",
    {
      schema: {
        tags: ["Vault"],
        summary: "List all vault credentials (masked passwords)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.READ)],
    },
    controller.list.bind(controller),
  );

  // Get single vault item
  app.get(
    "/vault/items/:id",
    {
      schema: {
        tags: ["Vault"],
        summary: "Get vault item details by ID",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.READ)],
    },
    controller.getById.bind(controller),
  );

  // Create vault item
  app.post(
    "/vault/items",
    {
      schema: {
        tags: ["Vault"],
        summary: "Create a new vault credential",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.create.bind(controller),
  );

  // Update vault item
  app.put(
    "/vault/items/:id",
    {
      schema: {
        tags: ["Vault"],
        summary: "Update existing vault credential",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.update.bind(controller),
  );

  // Delete vault item
  app.delete(
    "/vault/items/:id",
    {
      schema: {
        tags: ["Vault"],
        summary: "Delete vault credential by ID",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.delete.bind(controller),
  );

  // Reveal password with audit trail
  app.post(
    "/vault/items/:id/reveal",
    {
      schema: {
        tags: ["Vault"],
        summary: "Reveal plaintext password for vault item (audited)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.reveal.bind(controller),
  );

  // Generate secure password
  app.post(
    "/vault/generate-password",
    {
      schema: {
        tags: ["Vault"],
        summary: "Generate a cryptographically secure random password",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.generatePassword.bind(controller),
  );

  // Download blank template
  app.get(
    "/vault/template",
    {
      schema: {
        tags: ["Vault"],
        summary: "Download blank template for vault credentials import (.xlsx or .csv)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.READ)],
    },
    controller.template.bind(controller),
  );

  // Export credentials
  app.get(
    "/vault/export",
    {
      schema: {
        tags: ["Vault"],
        summary: "Export vault credentials to Excel or CSV file (decrypted & audited)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.READ)],
    },
    controller.export.bind(controller),
  );

  // Preview credentials before importing
  app.post(
    "/vault/preview",
    {
      schema: {
        tags: ["Vault"],
        summary: "Parse and preview vault credentials from Excel, CSV, or raw text",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.preview.bind(controller),
  );

  // Import credentials
  app.post(
    "/vault/import",
    {
      schema: {
        tags: ["Vault"],
        summary: "Import vault credentials from JSON array, raw CSV, or base64 file",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.import.bind(controller),
  );
}
