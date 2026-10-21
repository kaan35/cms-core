import type { FastifyInstance } from "fastify";
import type { ApiTokenController } from "../controllers/ApiTokenController.js";

export function registerApiTokenRoutes(app: FastifyInstance, ctrl: ApiTokenController): void {
  const { authenticate, verifyCsrf } = app;

  app.get(
    "/auth/tokens",
    {
      schema: {
        tags: ["Auth"],
        summary: "List all personal/agent API tokens for current user",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate],
    },
    ctrl.listTokens.bind(ctrl),
  );

  app.post(
    "/auth/tokens",
    {
      schema: {
        tags: ["Auth"],
        summary: "Create a new personal/agent API token",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf],
    },
    ctrl.createToken.bind(ctrl),
  );

  app.delete(
    "/auth/tokens/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke an API token",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf],
    },
    ctrl.deleteToken.bind(ctrl),
  );

  app.get(
    "/auth/tokens/:id/reveal",
    {
      schema: {
        tags: ["Auth"],
        summary: "Reveal raw API token for authenticated owner",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate],
    },
    ctrl.revealToken.bind(ctrl),
  );
}
