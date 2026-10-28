import type { IHookManager, ILogger } from "@cms/core";
import {
  ConflictError,
  EVENTS,
  NotFoundError,
  ValidationError,
  buildPaginatedResult,
} from "@cms/core";
import {
  type CreateUserInput,
  type UpdateUserInput,
  validateCreateUser,
  validateUpdateUser,
} from "../domain/auth.rules.js";
import { hashPassword, validatePasswordStrength } from "../domain/password.rules.js";
import type { RolesRepository } from "../repositories/rolesRepository.js";
import type { SessionsRepository } from "../repositories/sessionsRepository.js";
import type { UserDoc, UsersRepository } from "../repositories/usersRepository.js";

export class UserService {
  private readonly usersRepo: UsersRepository;
  private readonly rolesRepo: RolesRepository;
  private readonly sessionsRepo: SessionsRepository;
  private readonly hooks: IHookManager;
  private readonly logger: ILogger;
  private readonly saltRounds: number;

  constructor(
    usersRepo: UsersRepository,
    rolesRepo: RolesRepository,
    sessionsRepo: SessionsRepository,
    hooks: IHookManager,
    logger: ILogger,
    saltRounds = 12,
  ) {
    this.usersRepo = usersRepo;
    this.rolesRepo = rolesRepo;
    this.sessionsRepo = sessionsRepo;
    this.hooks = hooks;
    this.logger = logger;
    this.saltRounds = saltRounds;
  }

  async listUsers(page = 1, limit = 20) {
    const { items, total } = await this.usersRepo.findPaginated(page, limit);
    const allRoles = await this.rolesRepo.findAll();
    const roleMap = new Map(allRoles.map((r) => [r.id, r.name]));

    const sanitized = items.map((u) => {
      const roleNames = (u.roleIds || []).map((id) => roleMap.get(id)).filter(Boolean) as string[];
      const role = roleNames[0] || (u.permissions?.includes("*") ? "admin" : "user");
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role,
        roleIds: u.roleIds,
        permissions: u.permissions || [],
        status: u.status || "active",
        createdAt: u.createdAt,
      };
    });
    return buildPaginatedResult(sanitized, total, page, limit);
  }

  async getUserById(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    const roles = await this.rolesRepo.findByIds(user.roleIds || []);
    const roleNames = roles.map((r) => r.name);
    const primaryRole = roleNames[0] || (user.permissions?.includes("*") ? "admin" : "user");
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: primaryRole,
      roleIds: user.roleIds,
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
      permissions: user.permissions || [],
      status: user.status || "active",
      createdAt: user.createdAt,
    };
  }

  async createUser(input: unknown | CreateUserInput, actorId?: string) {
    const validated = validateCreateUser(input);

    const email = validated.email;
    const pwdVal = validatePasswordStrength(validated.password);
    if (!pwdVal.valid) {
      throw new ValidationError(pwdVal.error ?? "Invalid password");
    }

    const existing = await this.usersRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError("A user with this email address already exists");
    }

    let roleIds = validated.roleIds || [];
    if (roleIds.length > 0) {
      const roles = await this.rolesRepo.findByIds(roleIds);
      if (roles.length !== roleIds.length) {
        throw new ValidationError("One or more assigned role IDs do not exist");
      }
      roleIds = roles.map((r) => r.id);
    } else if (validated.role) {
      const matched = await this.rolesRepo.findByName(validated.role);
      if (matched) {
        roleIds = [matched.id];
      }
    }

    const passwordHash = await hashPassword(validated.password, this.saltRounds);
    const user = await this.usersRepo.create({
      email,
      passwordHash,
      name: validated.name,
      roleIds,
      permissions: validated.permissions,
      status: validated.status || "active",
    });

    await this.hooks.emit(EVENTS.AUTH.USER_CREATED, {
      userId: user.id,
      email: user.email,
      actorId,
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: validated.role || "user",
      roleIds: user.roleIds,
      permissions: user.permissions || [],
      status: user.status || "active",
      createdAt: user.createdAt,
    };
  }

  async updateUser(id: string, input: unknown | UpdateUserInput, actorId?: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const validated = validateUpdateUser(input);

    const patch: Partial<UserDoc> = {};

    if (validated.email && validated.email !== user.email) {
      const existing = await this.usersRepo.findByEmail(validated.email);
      if (existing && existing.id !== id) {
        throw new ConflictError("A user with this email address already exists");
      }
      patch.email = validated.email;
    }

    if (validated.name !== undefined) {
      patch.name = validated.name;
    }

    if (validated.roleIds !== undefined) {
      if (validated.roleIds.length > 0) {
        const roles = await this.rolesRepo.findByIds(validated.roleIds);
        if (roles.length !== validated.roleIds.length) {
          throw new ValidationError("One or more assigned role IDs do not exist");
        }
        patch.roleIds = roles.map((r) => r.id);
      } else {
        patch.roleIds = [];
      }
    } else if (validated.role !== undefined) {
      const matched = await this.rolesRepo.findByName(validated.role);
      if (matched) {
        patch.roleIds = [matched.id];
      } else {
        const byId = await this.rolesRepo.findById(validated.role);
        if (byId) {
          patch.roleIds = [byId.id];
        }
      }
    }

    if (validated.permissions !== undefined) {
      patch.permissions = validated.permissions;
    }

    if (validated.status !== undefined) {
      patch.status = validated.status;
    }

    if (validated.password) {
      const pwdVal = validatePasswordStrength(validated.password);
      if (!pwdVal.valid) {
        throw new ValidationError(pwdVal.error ?? "Invalid password");
      }
      patch.passwordHash = await hashPassword(validated.password, this.saltRounds);
    }

    const updated = await this.usersRepo.update(id, patch);
    if (!updated) {
      throw new NotFoundError("User not found");
    }

    if (validated.password) {
      await this.sessionsRepo.revokeByUserId(id, actorId, "password_changed");
      await this.hooks.emit(EVENTS.AUTH.SESSION_REVOKED, {
        userId: id,
        actorId,
        reason: "password_changed",
      });
      this.logger.info("Revoked all sessions for user after password update", {
        userId: id,
        actorId,
      });
    }

    if (validated.status === "suspended") {
      await this.sessionsRepo.revokeByUserId(user.id, actorId, "user_suspended");
      await this.hooks.emit(EVENTS.AUTH.SESSION_REVOKED, {
        userId: user.id,
        actorId,
        reason: "user_suspended",
      });
      await this.hooks.emit(EVENTS.AUTH.USER_SUSPENDED, {
        userId: user.id,
        actorId,
      });
      this.logger.info("Revoked all sessions for user after suspension", {
        userId: user.id,
        actorId,
      });
    } else if (validated.status === "active" && user.status === "suspended") {
      await this.hooks.emit(EVENTS.AUTH.USER_ACTIVATED, {
        userId: user.id,
        actorId,
      });
    }

    if (validated.status === "suspended") {
      await this.hooks.emit(EVENTS.AUTH.USER_UPDATED, { userId: user.id, status: "suspended" });
    } else {
      await this.hooks.emit(EVENTS.AUTH.USER_UPDATED, { userId: id, actorId });
    }

    const roles = await this.rolesRepo.findByIds(updated.roleIds || []);
    const roleNames = roles.map((r) => r.name);
    const primaryRole = roleNames[0] || (updated.permissions?.includes("*") ? "admin" : "user");

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: primaryRole,
      roleIds: updated.roleIds,
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
      permissions: updated.permissions || [],
      status: updated.status || "active",
      createdAt: updated.createdAt,
    };
  }

  async deleteUser(id: string, currentUserId: string, actorId?: string) {
    if (id === currentUserId) {
      throw new ValidationError("You cannot delete your own account");
    }
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    await this.usersRepo.delete(id);
    await this.sessionsRepo.revokeByUserId(id, actorId, "admin_revoked");
    await this.hooks.emit(EVENTS.AUTH.SESSION_REVOKED, {
      userId: id,
      actorId,
      reason: "admin_revoked",
    });

    await this.hooks.emit(EVENTS.AUTH.USER_DELETED, {
      userId: id,
      email: user.email,
      actorId,
    });
    this.logger.info("User deleted", { userId: id });
  }
}
