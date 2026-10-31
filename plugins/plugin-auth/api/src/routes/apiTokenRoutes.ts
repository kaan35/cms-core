import type { FastifyInstance } from "fastify";
import type { ApiTokenController } from "../controllers/ApiTokenController.js";
import {
  ApiTokenListResponseSchema,
  ApiTokensQuerySchema,
  AuthIdParamSchema,
  CreateApiTokenResponseSchema,
  CreateApiTokenSchema,
  OkResponseSchema,
  RevealApiTokenResponseSchema,
  type ApiTokensQuery,
  type AuthIdParam,
  type CreateApiTokenInput,
} from "../domain/auth.rules.js";

export function registerApiTokenRoutes(app: FastifyInstance, ctrl: ApiTokenController): void {
  const { authenticate, verifyCsrf } = app;

  app.get<{ Querystring: ApiTokensQuery }>(
    "/auth/tokens",
    {
      schema: {
        tags: ["Auth"],
        summary: "List all personal/agent API tokens for current user",
        security: [{ cookieAuth: [] }],
        querystring: ApiTokensQuerySchema,
        response: { 200: ApiTokenListResponseSchema },
      },
      preHandler: [authenticate],
    },
    ctrl.listTokens.bind(ctrl),
  );

  app.post<{ Body: CreateApiTokenInput }>(
    "/auth/tokens",
    {
      schema: {
        tags: ["Auth"],
        summary: "Create a new personal/agent API token",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        body: CreateApiTokenSchema,
        response: { 201: CreateApiTokenResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf],
    },
    ctrl.createToken.bind(ctrl),
  );

  app.delete<{ Params: AuthIdParam }>(
    "/auth/tokens/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke an API token",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: AuthIdParamSchema,
        response: { 200: OkResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf],
    },
    ctrl.deleteToken.bind(ctrl),
  );

  app.get<{ Params: AuthIdParam }>(
    "/auth/tokens/:id/reveal",
    {
      schema: {
        tags: ["Auth"],
        summary: "Reveal raw API token for authenticated owner",
        security: [{ cookieAuth: [] }],
        params: AuthIdParamSchema,
        response: { 200: RevealApiTokenResponseSchema },
      },
      preHandler: [authenticate],
    },
    ctrl.revealToken.bind(ctrl),
  );
}
