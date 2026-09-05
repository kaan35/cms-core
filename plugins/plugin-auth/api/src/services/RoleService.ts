import type { IHookManager, ILogger } from "@cms/core";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@cms/core";
import { EVENTS } from "@cms/core";
import {
  type CreateRoleInput,
  type UpdateRoleInput,
  validateCreateRole,
  validateUpdateRole,
} from "../domain/auth.rules.js";
import { ADMIN_ROLE_NAME } from "../domain/permission.rules.js";
import type { RoleDoc, RolesRepository } from "../repositories/rolesRepository.js";
import type { UsersRepository } from "../repositories/usersRepository.js";

export class RoleService {
  private readonly rolesRepo: RolesRepository;
  private readonly usersRepo: UsersRepository;
  private readonly hooks: IHookManager;
  private readonly logger: ILogger;

  constructor(
    rolesRepo: RolesRepository,
    usersRepo: UsersRepository,
    hooks: IHookManager,
    logger: ILogger,
  ) {
    this.rolesRepo = rolesRepo;
    this.usersRepo = usersRepo;
    this.hooks = hooks;
    this.logger = logger;
  }

  async listRoles(): Promise<RoleDoc[]> {
    return this.rolesRepo.findAll();
  }

  async getRoleById(id: string): Promise<RoleDoc> {
    const role = await this.rolesRepo.findById(id);
    if (!role) {
      throw new NotFoundError("Role not found");
    }
    return role;
  }

  async createRole(input: unknown | CreateRoleInput, actorId?: string): Promise<RoleDoc> {
    const validated =
      typeof input === "object" && input !== null && "name" in input
        ? (input as CreateRoleInput)
        : validateCreateRole(input);

    const existing = await this.rolesRepo.findByName(validated.name);
    if (existing) {
      throw new ConflictError("A role with this name already exists");
    }

    const role = await this.rolesRepo.create({
      name: validated.name,
      description: validated.description,
      permissions: validated.permissions,
    });

    await this.hooks.emit(EVENTS.AUTH.ROLE_CREATED, {
      roleId: role.id,
      name: role.name,
      actorId,
    });
    return role;
  }

  async updateRole(
    id: string,
    input: unknown | UpdateRoleInput,
    actorId?: string,
  ): Promise<RoleDoc> {
    const role = await this.rolesRepo.findById(id);
    if (!role) {
      throw new NotFoundError("Role not found");
    }

    const validated =
      typeof input === "object" && input !== null
        ? (input as UpdateRoleInput)
        : validateUpdateRole(input);

    if (role.name === ADMIN_ROLE_NAME && validated.name && validated.name !== ADMIN_ROLE_NAME) {
      throw new ForbiddenError("The admin role cannot be renamed");
    }

    if (validated.name && validated.name !== role.name) {
      const existing = await this.rolesRepo.findByName(validated.name);
      if (existing && existing.id !== id) {
        throw new ConflictError("A role with this name already exists");
      }
    }

    const updated = await this.rolesRepo.update(id, {
      ...(validated.name ? { name: validated.name } : {}),
      ...(validated.description !== undefined ? { description: validated.description } : {}),
      ...(validated.permissions ? { permissions: validated.permissions } : {}),
    });

    if (!updated) {
      throw new NotFoundError("Role not found");
    }

    await this.hooks.emit(EVENTS.AUTH.ROLE_UPDATED, { roleId: id, actorId });
    return updated;
  }

  async deleteRole(id: string, actorId?: string): Promise<void> {
    const role = await this.rolesRepo.findById(id);
    if (!role) {
      throw new NotFoundError("Role not found");
    }

    if (role.name === ADMIN_ROLE_NAME) {
      throw new ForbiddenError("The admin role cannot be deleted");
    }

    const usersWithRole = await this.usersRepo.findByRoleId(id);
    if (usersWithRole.length > 0) {
      throw new ValidationError(
        `Cannot delete role "${role.name}" because it is assigned to ${usersWithRole.length} user(s)`,
      );
    }

    await this.rolesRepo.delete(id);
    await this.hooks.emit(EVENTS.AUTH.ROLE_DELETED, {
      roleId: id,
      name: role.name,
      actorId,
    });
    this.logger.info("Role deleted", { roleId: id });
  }
}
