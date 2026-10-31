import path from "node:path";
import process from "node:process";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  parsePaginationQuery,
} from "@cms/core";
import {
  validateCreateApiToken,
  type ApiTokensQuery,
  type AuthIdParam,
  type CreateApiTokenInput,
} from "../domain/auth.rules.js";
import type { ApiTokenService } from "../services/ApiTokenService.js";

export class ApiTokenController {
  private readonly apiTokenService: ApiTokenService;

  constructor(apiTokenService: ApiTokenService) {
    this.apiTokenService = apiTokenService;
  }

  async createToken(
    request: FastifyRequest<{ Body: CreateApiTokenInput }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (user.sessionId?.startsWith("api-token:")) {
      throw new ForbiddenError("API tokens cannot manage API tokens");
    }

    const parsed = validateCreateApiToken(request.body);
    const scopes = parsed.scopes && parsed.scopes.length > 0 ? parsed.scopes : ["*"];

    const { rawToken, token } = await this.apiTokenService.createToken(
      user.id,
      parsed.name,
      scopes,
      parsed.expiresInDays,
    );

    const mcpServerPath = path.resolve(process.cwd(), "packages/mcp-server/dist/index.js");

    return reply.status(201).send({
      token: rawToken,
      mcpServerPath,
      tokenInfo: {
        id: token.id,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        scopes: token.scopes,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      },
    });
  }

  async listTokens(
    request: FastifyRequest<{ Querystring: ApiTokensQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (user.sessionId?.startsWith("api-token:")) {
      throw new ForbiddenError("API tokens cannot list API tokens");
    }

    const { page, limit } = parsePaginationQuery(request.query);
    const search = request.query?.search?.trim();
    const scopeVal = request.query?.scope;
    const scope = scopeVal === "full" || scopeVal === "scoped" ? scopeVal : undefined;
    const statusVal = request.query?.status;
    const status =
      statusVal === "active" || statusVal === "revoked" || statusVal === "expired"
        ? statusVal
        : undefined;

    const paginated = await this.apiTokenService.listUserTokensPaginated(user.id, page, limit, {
      search,
      scope,
      status,
    });
    const mcpServerPath = path.resolve(process.cwd(), "packages/mcp-server/dist/index.js");
    return reply.send({
      tokens: paginated.data,
      data: paginated.data,
      meta: paginated.meta,
      stats: paginated.stats,
      mcpServerPath,
    });
  }

  async deleteToken(
    request: FastifyRequest<{ Params: AuthIdParam }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (user.sessionId?.startsWith("api-token:")) {
      throw new ForbiddenError("API tokens cannot delete API tokens");
    }

    const { id } = request.params;
    if (!id) {
      throw new ValidationError("Token ID is required");
    }

    await this.apiTokenService.revokeToken(id, user);
    return reply.send({ ok: true });
  }

  async revealToken(
    request: FastifyRequest<{ Params: AuthIdParam }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (user.sessionId?.startsWith("api-token:")) {
      throw new ForbiddenError("API tokens cannot reveal API tokens");
    }

    const { id } = request.params;
    if (!id) {
      throw new ValidationError("Token ID is required");
    }

    const token = await this.apiTokenService.revealToken(id, user);
    return reply.send({ token });
  }
}
