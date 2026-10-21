import { parsePaginationQuery } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  SYSTEM_PERMISSIONS,
  validateCreateFeatureFlag,
  validateTogglePlugin,
  validateUpdateFeatureFlag,
  validateUpdateSettings,
} from "./domain/system.rules.js";
import type { AuditLogFilterOptions } from "./repositories/auditLogRepository.js";
import type { SystemService } from "./services/SystemService.js";

function getActorId(request: FastifyRequest): string | undefined {
  return (request as unknown as { user?: { id?: string } }).user?.id;
}

export class SystemController {
  private readonly systemService: SystemService;

  constructor(systemService: SystemService) {
    this.systemService = systemService;
  }

  async listPlugins(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const plugins = await this.systemService.listPlugins();
    return reply.send({ plugins });
  }

  async togglePlugin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as { name: string };
    const { enabled } = validateTogglePlugin(request.body);

    const updated = await this.systemService.togglePlugin(
      params.name,
      enabled,
      getActorId(request),
    );
    return reply.send({ plugin: updated });
  }

  async getSettings(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const settings = await this.systemService.getSettings();
    return reply.send({ settings });
  }

  async updateSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const validated = validateUpdateSettings(request.body);
    const updated = await this.systemService.updateSettings(validated, getActorId(request));
    return reply.send({ settings: updated });
  }

  async listFeatureFlags(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const flags = await this.systemService.listFeatureFlags();
    return reply.send({ flags });
  }

  async createFeatureFlag(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const validated = validateCreateFeatureFlag(request.body);
    const flag = await this.systemService.createFeatureFlag(validated, getActorId(request));
    return reply.status(201).send({ flag });
  }

  async updateFeatureFlag(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as { key: string };
    const validated = validateUpdateFeatureFlag(request.body);
    const updated = await this.systemService.updateFeatureFlag(
      params.key,
      validated,
      getActorId(request),
    );
    return reply.send({ flag: updated });
  }

  async deleteFeatureFlag(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as { key: string };
    await this.systemService.deleteFeatureFlag(params.key, getActorId(request));
    return reply.send({ ok: true });
  }

  async listAuditLogs(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = (
      request as unknown as { user?: { id?: string; permissions?: string[]; sessionId?: string } }
    ).user;
    const permissions = user?.permissions || [];
    const isApiToken = Boolean(user?.sessionId?.startsWith("api-token:"));
    const hasAuditRead =
      (permissions.includes("*") || permissions.includes(SYSTEM_PERMISSIONS.AUDIT_LOG_READ)) &&
      !isApiToken;

    const query = (request.query || {}) as Record<string, unknown>;
    const { page, limit } = parsePaginationQuery(query);
    const search = typeof query["search"] === "string" ? query["search"] : undefined;
    const tz = typeof query["tz"] === "string" ? query["tz"] : undefined;

    let actorId: string | undefined;
    if (hasAuditRead) {
      actorId =
        typeof query["actorId"] === "string" && query["actorId"].trim()
          ? query["actorId"].trim()
          : undefined;
    } else {
      if (!user?.id) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      actorId = user.id;
    }

    const actorType =
      query["actorType"] === "user" ||
      query["actorType"] === "agent" ||
      query["actorType"] === "system"
        ? query["actorType"]
        : undefined;

    const status =
      query["status"] === "success" ||
      query["status"] === "access_denied" ||
      query["status"] === "error"
        ? query["status"]
        : undefined;

    const tokenId =
      typeof query["tokenId"] === "string" && query["tokenId"].trim()
        ? query["tokenId"].trim()
        : undefined;

    const toolName =
      typeof query["toolName"] === "string" && query["toolName"].trim()
        ? query["toolName"].trim()
        : undefined;

    const event =
      typeof query["event"] === "string" && query["event"].trim()
        ? query["event"].trim()
        : undefined;

    const filter: AuditLogFilterOptions = {
      ...(actorId ? { actorId } : {}),
      ...(actorType ? { actorType } : {}),
      ...(status ? { status } : {}),
      ...(tokenId ? { tokenId } : {}),
      ...(toolName ? { toolName } : {}),
      ...(event ? { event } : {}),
    };

    const paginated = await this.systemService.listAuditLogs(page, limit, search, tz, filter);
    return reply.send(paginated);
  }

  async getStats(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const stats = await this.systemService.getStats();
    return reply.send(stats);
  }
}
