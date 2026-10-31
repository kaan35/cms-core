import { PERMISSIONS } from "@cms/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { VaultController } from "./controllers/vaultController.js";
import {
  CreateVaultItemSchema,
  GeneratePasswordSchema,
  UpdateVaultItemSchema,
  VaultDeleteResponseSchema,
  VaultFormatQuerySchema,
  VaultIdParamSchema,
  VaultImportResponseSchema,
  VaultImportSchema,
  VaultItemListResponseSchema,
  VaultItemSingleResponseSchema,
  VaultPasswordResponseSchema,
  VaultPreviewResponseSchema,
  VaultPreviewSchema,
  VaultQuerySchema,
  type CreateVaultItemInput,
  type GeneratePasswordInput,
  type UpdateVaultItemInput,
  type VaultFormatQuery,
  type VaultIdParam,
  type VaultImportInput,
  type VaultPreviewInput,
  type VaultQuery,
} from "./domain/vault.rules.js";

export function registerVaultRoutes(app: FastifyInstance, controller: VaultController): void {
  const authenticate = (req: FastifyRequest, reply: FastifyReply) =>
    typeof app.authenticate === "function" ? app.authenticate(req, reply) : Promise.resolve();
  const verifyCsrf = (req: FastifyRequest, reply: FastifyReply) =>
    typeof app.verifyCsrf === "function" ? app.verifyCsrf(req, reply) : Promise.resolve();
  const checkPermission = (permission: string) => (req: FastifyRequest, reply: FastifyReply) =>
    typeof app.checkPermission === "function"
      ? app.checkPermission(permission)(req, reply)
      : Promise.resolve();

  // List vault credentials
  app.get<{ Querystring: VaultQuery }>(
    "/vault/items",
    {
      schema: {
        tags: ["Vault"],
        summary: "List all vault credentials (masked passwords)",
        security: [{ cookieAuth: [] }],
        querystring: VaultQuerySchema,
        response: { 200: VaultItemListResponseSchema },
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.READ)],
    },
    controller.list.bind(controller),
  );

  // Get single vault item
  app.get<{ Params: VaultIdParam }>(
    "/vault/items/:id",
    {
      schema: {
        tags: ["Vault"],
        summary: "Get vault item details by ID",
        security: [{ cookieAuth: [] }],
        params: VaultIdParamSchema,
        response: { 200: VaultItemSingleResponseSchema },
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.READ)],
    },
    controller.getById.bind(controller),
  );

  // Create vault item
  app.post<{ Body: CreateVaultItemInput }>(
    "/vault/items",
    {
      schema: {
        tags: ["Vault"],
        summary: "Create a new vault credential",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        body: CreateVaultItemSchema,
        response: { 201: VaultItemSingleResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.create.bind(controller),
  );

  // Update vault item
  app.put<{ Params: VaultIdParam; Body: UpdateVaultItemInput }>(
    "/vault/items/:id",
    {
      schema: {
        tags: ["Vault"],
        summary: "Update existing vault credential",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: VaultIdParamSchema,
        body: UpdateVaultItemSchema,
        response: { 200: VaultItemSingleResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.update.bind(controller),
  );

  // Delete vault item
  app.delete<{ Params: VaultIdParam }>(
    "/vault/items/:id",
    {
      schema: {
        tags: ["Vault"],
        summary: "Delete vault credential by ID",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: VaultIdParamSchema,
        response: { 200: VaultDeleteResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.delete.bind(controller),
  );

  // Reveal password with audit trail
  app.post<{ Params: VaultIdParam }>(
    "/vault/items/:id/reveal",
    {
      schema: {
        tags: ["Vault"],
        summary: "Reveal plaintext password for vault item (audited)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: VaultIdParamSchema,
        response: { 200: VaultPasswordResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.reveal.bind(controller),
  );

  // Generate secure password
  app.post<{ Body: GeneratePasswordInput }>(
    "/vault/generate-password",
    {
      schema: {
        tags: ["Vault"],
        summary: "Generate a cryptographically secure random password",
        security: [{ cookieAuth: [] }],
        body: GeneratePasswordSchema,
        response: { 200: VaultPasswordResponseSchema },
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.generatePassword.bind(controller),
  );

  // Download blank template
  app.get<{ Querystring: VaultFormatQuery }>(
    "/vault/template",
    {
      schema: {
        tags: ["Vault"],
        summary: "Download blank template for vault credentials import (.xlsx or .csv)",
        security: [{ cookieAuth: [] }],
        querystring: VaultFormatQuerySchema,
        response: {
          200: {
            description: "Blank template (.xlsx or .csv)",
            content: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
                schema: { type: "string", format: "binary" },
              },
              "text/csv": {
                schema: { type: "string" },
              },
            },
          },
        },
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.READ)],
    },
    controller.template.bind(controller),
  );

  // Export credentials
  app.get<{ Querystring: VaultFormatQuery }>(
    "/vault/export",
    {
      schema: {
        tags: ["Vault"],
        summary: "Export vault credentials to Excel or CSV file (decrypted & audited)",
        security: [{ cookieAuth: [] }],
        querystring: VaultFormatQuerySchema,
        response: {
          200: {
            description: "Decrypted vault credentials export (.xlsx or .csv)",
            content: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
                schema: { type: "string", format: "binary" },
              },
              "text/csv": {
                schema: { type: "string" },
              },
            },
          },
        },
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.READ)],
    },
    controller.export.bind(controller),
  );

  // Preview credentials before importing
  app.post<{ Body: VaultPreviewInput }>(
    "/vault/preview",
    {
      schema: {
        tags: ["Vault"],
        summary: "Parse and preview vault credentials from Excel, CSV, or raw text",
        security: [{ cookieAuth: [] }],
        body: VaultPreviewSchema,
        response: { 200: VaultPreviewResponseSchema },
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.preview.bind(controller),
  );

  // Import credentials
  app.post<{ Body: VaultImportInput }>(
    "/vault/import",
    {
      schema: {
        tags: ["Vault"],
        summary: "Import vault credentials from JSON array, raw CSV, or base64 file",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        body: VaultImportSchema,
        response: { 200: VaultImportResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.VAULT.WRITE)],
    },
    controller.import.bind(controller),
  );
}
