import { parsePaginationQuery } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  AuthIdParam,
  CreateRoleInput,
  RolesQuery,
  UpdateRoleInput,
} from "../domain/auth.rules.js";
import type { RoleService } from "../services/RoleService.js";

export class RoleController {
  private readonly roleService: RoleService;

  constructor(roleService: RoleService) {
    this.roleService = roleService;
  }

  async listRoles(
    request: FastifyRequest<{ Querystring: RolesQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { page, limit } = parsePaginationQuery(request.query);
    const search = request.query?.search?.trim();
    const typeVal = request.query?.type;
    const isSystem = typeVal === "system" ? true : typeVal === "custom" ? false : undefined;
    const paginated = await this.roleService.listRolesPaginated(page, limit, { search, isSystem });
    return reply.send({
      roles: paginated.data,
      data: paginated.data,
      meta: paginated.meta,
      stats: paginated.stats,
    });
  }

  async getRoleById(
    request: FastifyRequest<{ Params: AuthIdParam }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params;
    const role = await this.roleService.getRoleById(id);
    return reply.send({ role });
  }

  async createRole(
    request: FastifyRequest<{ Body: CreateRoleInput }>,
    reply: FastifyReply,
  ): Promise<void> {
    const role = await this.roleService.createRole(request.body, request.user?.id);
    return reply.status(201).send({ role });
  }

  async updateRole(
    request: FastifyRequest<{ Params: AuthIdParam; Body: UpdateRoleInput }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params;
    const role = await this.roleService.updateRole(id, request.body, request.user?.id);
    return reply.send({ role });
  }

  async deleteRole(
    request: FastifyRequest<{ Params: AuthIdParam }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params;
    await this.roleService.deleteRole(id, request.user?.id);
    return reply.send({ ok: true });
  }
}
