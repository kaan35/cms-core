import { parsePaginationQuery } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { RoleService } from "../services/RoleService.js";

export class RoleController {
  private readonly roleService: RoleService;

  constructor(roleService: RoleService) {
    this.roleService = roleService;
  }

  async listRoles(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = (request.query || {}) as Record<string, string | undefined>;
    const { page, limit } = parsePaginationQuery(request.query);
    const search = query["search"]?.trim();
    const typeVal = query["type"];
    const isSystem = typeVal === "system" ? true : typeVal === "custom" ? false : undefined;
    const paginated = await this.roleService.listRolesPaginated(page, limit, { search, isSystem });
    return reply.send({
      roles: paginated.data,
      data: paginated.data,
      meta: paginated.meta,
    });
  }

  async getRoleById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const role = await this.roleService.getRoleById(id);
    return reply.send({ role });
  }

  async createRole(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const role = await this.roleService.createRole(request.body, request.user?.id);
    return reply.status(201).send({ role });
  }

  async updateRole(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const role = await this.roleService.updateRole(id, request.body, request.user?.id);
    return reply.send({ role });
  }

  async deleteRole(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    await this.roleService.deleteRole(id, request.user?.id);
    return reply.send({ ok: true });
  }
}
