import path from "node:path";
import process from "node:process";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@cms/core";
import type { ApiTokenService } from "../services/ApiTokenService.js";

export class ApiTokenController {
  private readonly apiTokenService: ApiTokenService;

  constructor(apiTokenService: ApiTokenService) {
    this.apiTokenService = apiTokenService;
  }

  async createToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (user.sessionId?.startsWith("api-token:")) {
      throw new ForbiddenError("API tokens cannot manage API tokens");
    }

    const body = (request.body || {}) as {
      name?: unknown;
      scopes?: unknown;
      expiresInDays?: unknown;
    };

    if (
      typeof body.name !== "string" ||
      body.name.trim().length === 0 ||
      body.name.trim().length > 50
    ) {
      throw new ValidationError("Token name must be between 1 and 50 characters");
    }

    const name = body.name.trim();

    let scopes: string[] = ["*"];
    if (Array.isArray(body.scopes)) {
      const filtered = body.scopes.filter(
        (s): s is string => typeof s === "string" && s.trim().length > 0,
      );
      if (filtered.length > 0) {
        scopes = filtered;
      }
    }

    let expiresInDays: number | undefined;
    if (
      typeof body.expiresInDays === "number" &&
      !isNaN(body.expiresInDays) &&
      body.expiresInDays > 0
    ) {
      expiresInDays = body.expiresInDays;
    }

    const { rawToken, token } = await this.apiTokenService.createToken(
      user.id,
      name,
      scopes,
      expiresInDays,
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

  async listTokens(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (user.sessionId?.startsWith("api-token:")) {
      throw new ForbiddenError("API tokens cannot list API tokens");
    }

    const tokens = await this.apiTokenService.listUserTokens(user.id);
    const mcpServerPath = path.resolve(process.cwd(), "packages/mcp-server/dist/index.js");
    return reply.send({ tokens, mcpServerPath });
  }

  async deleteToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (user.sessionId?.startsWith("api-token:")) {
      throw new ForbiddenError("API tokens cannot delete API tokens");
    }

    const { id } = request.params as { id: string };
    if (!id) {
      throw new ValidationError("Token ID is required");
    }

    await this.apiTokenService.revokeToken(id, user);
    return reply.send({ ok: true });
  }

  async revealToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (user.sessionId?.startsWith("api-token:")) {
      throw new ForbiddenError("API tokens cannot reveal API tokens");
    }

    const { id } = request.params as { id: string };
    if (!id) {
      throw new ValidationError("Token ID is required");
    }

    const token = await this.apiTokenService.revealToken(id, user);
    return reply.send({ token });
  }
}
