import { parsePaginationQuery, ValidationError } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SystemService } from "./systemService.js";

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
    const body = request.body as { enabled?: boolean } | undefined;

    if (typeof body?.enabled !== "boolean") {
      throw new ValidationError("Body property 'enabled' must be a boolean");
    }

    const updated = await this.systemService.togglePlugin(
      params.name,
      body.enabled,
      request.user?.id,
    );
    return reply.send({ plugin: updated });
  }

  async getSettings(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const settings = await this.systemService.getSettings();
    return reply.send({ settings });
  }

  async updateSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== "object") {
      throw new ValidationError("Request body is required");
    }

    const patch = {
      siteTitle: typeof body["siteTitle"] === "string" ? body["siteTitle"] : undefined,
      siteDescription:
        typeof body["siteDescription"] === "string" ? body["siteDescription"] : undefined,
      brandColor: typeof body["brandColor"] === "string" ? body["brandColor"] : undefined,
      brandFont: typeof body["brandFont"] === "string" ? body["brandFont"] : undefined,
      primaryColor: typeof body["primaryColor"] === "string" ? body["primaryColor"] : undefined,
      fontFamily: typeof body["fontFamily"] === "string" ? body["fontFamily"] : undefined,
      allowRegistration:
        typeof body["allowRegistration"] === "boolean" ? body["allowRegistration"] : undefined,
      sessionTimeoutMinutes:
        typeof body["sessionTimeoutMinutes"] === "number"
          ? body["sessionTimeoutMinutes"]
          : undefined,
    };
    const updated = await this.systemService.updateSettings(patch, request.user?.id);

    return reply.send({ settings: updated });
  }

  async listFeatureFlags(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const flags = await this.systemService.listFeatureFlags();
    return reply.send({ flags });
  }

  async createFeatureFlag(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as Record<string, unknown> | undefined;
    const key = typeof body?.["key"] === "string" ? body["key"] : "";
    const label = typeof body?.["label"] === "string" ? body["label"] : "";
    const value = typeof body?.["value"] === "boolean" ? body["value"] : false;

    const flag = await this.systemService.createFeatureFlag(
      {
        key,
        label,
        value,
        ...(typeof body?.["description"] === "string" ? { description: body["description"] } : {}),
      },
      request.user?.id,
    );

    return reply.status(201).send({ flag });
  }

  async updateFeatureFlag(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as { key: string };
    const body = request.body as Record<string, unknown> | undefined;

    const patch: { label?: string; description?: string; value?: boolean } = {
      ...(typeof body?.["label"] === "string" ? { label: body["label"] } : {}),
      ...(typeof body?.["description"] === "string" ? { description: body["description"] } : {}),
      ...(typeof body?.["value"] === "boolean" ? { value: body["value"] } : {}),
    };

    const updated = await this.systemService.updateFeatureFlag(params.key, patch, request.user?.id);

    return reply.send({ flag: updated });
  }

  async deleteFeatureFlag(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as { key: string };
    await this.systemService.deleteFeatureFlag(params.key, request.user?.id);
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
