import { parsePaginationQuery } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  SYSTEM_PERMISSIONS,
  validateTogglePlugin,
  validateUpdateSettings,
  type AuditLogQuery,
  type PluginNameParam,
  type TogglePluginInput,
  type UpdateSettingsInput,
} from "./domain/system.rules.js";
import type { AuditLogFilterOptions } from "./repositories/auditLogRepository.js";
import type { SystemService } from "./services/SystemService.js";

function getActorId(request: FastifyRequest): string | undefined {
  return request.user?.id;
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

  async togglePlugin(
    request: FastifyRequest<{ Params: PluginNameParam; Body: TogglePluginInput }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { name } = request.params;
    const { enabled } = validateTogglePlugin(request.body);

    const updated = await this.systemService.togglePlugin(name, enabled, getActorId(request));
    return reply.send({ plugin: updated });
  }

  async getSettings(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const settings = await this.systemService.getSettings();
    return reply.send({ settings });
  }

  async updateSettings(
    request: FastifyRequest<{ Body: UpdateSettingsInput }>,
    reply: FastifyReply,
  ): Promise<void> {
    const validated = validateUpdateSettings(request.body);
    const updated = await this.systemService.updateSettings(validated, getActorId(request));
    return reply.send({ settings: updated });
  }

  async listAuditLogs(
    request: FastifyRequest<{ Querystring: AuditLogQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.user;
    const permissions = user?.permissions || [];
    const isApiToken = Boolean(user?.sessionId?.startsWith("api-token:"));
    const hasAuditRead =
      (permissions.includes("*") || permissions.includes(SYSTEM_PERMISSIONS.AUDIT_LOG_READ)) &&
      !isApiToken;

    const query = request.query;
    const { page, limit } = parsePaginationQuery(query);
    const search = query.search?.trim() || undefined;
    const tz = query.tz?.trim() || undefined;

    let actorId: string | undefined;
    if (hasAuditRead) {
      actorId = query.actorId?.trim() || undefined;
    } else {
      if (!user?.id) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      actorId = user.id;
    }

    const actorType = query.actorType;
    const status = query.status;
    const tokenId = query.tokenId?.trim() || undefined;
    const toolName = query.toolName?.trim() || undefined;
    const event = (query.event || query.action)?.trim() || undefined;

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
