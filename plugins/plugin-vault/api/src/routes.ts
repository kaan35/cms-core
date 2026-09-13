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
    customApp.authenticate(req, reply);
  const verifyCsrf = (req: FastifyRequest, reply: FastifyReply) => customApp.verifyCsrf(req, reply);

  // List vault credentials
  app.get(
    "/vault/items",
    {
      schema: {
        tags: ["Vault"],
        summary: "List all vault credentials (masked passwords)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate],
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
      preHandler: [authenticate],
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
      preHandler: [authenticate, verifyCsrf],
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
      preHandler: [authenticate, verifyCsrf],
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
      preHandler: [authenticate, verifyCsrf],
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
      preHandler: [authenticate, verifyCsrf],
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
      preHandler: [authenticate],
    },
    controller.generatePassword.bind(controller),
  );
}
