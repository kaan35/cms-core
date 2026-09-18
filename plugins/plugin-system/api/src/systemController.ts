import { parsePaginationQuery } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  validateCreateFeatureFlag,
  validateTogglePlugin,
  validateUpdateFeatureFlag,
  validateUpdateSettings,
} from "./domain/system.rules.js";
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
    const { page, limit } = parsePaginationQuery(request.query as Record<string, unknown>);
    const paginated = await this.systemService.listAuditLogs(page, limit);
    return reply.send(paginated);
  }

  async getStats(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const stats = await this.systemService.getStats();
    return reply.send(stats);
  }
}
