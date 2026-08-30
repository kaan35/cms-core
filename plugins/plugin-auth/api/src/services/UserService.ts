import type { HookManager, ILogger } from "@cms/core";
import { ConflictError, NotFoundError, ValidationError, buildPaginatedResult } from "@cms/core";
import { EVENTS } from "@cms/core";
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
  private readonly hooks: HookManager;
  private readonly logger: ILogger;
  private readonly saltRounds: number;

  constructor(
    usersRepo: UsersRepository,
    rolesRepo: RolesRepository,
    sessionsRepo: SessionsRepository,
    hooks: HookManager,
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
    const sanitized = items.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      roleIds: u.roleIds,
      permissions: u.permissions || [],
      createdAt: u.createdAt,
    }));
    return buildPaginatedResult(sanitized, total, page, limit);
  }

  async getUserById(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    const roles = await this.rolesRepo.findByIds(user.roleIds || []);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleIds: user.roleIds,
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
      permissions: user.permissions || [],
      createdAt: user.createdAt,
    };
  }

  async createUser(input: unknown | CreateUserInput, actorId?: string) {
    const validated =
      typeof input === "object" && input !== null && "password" in input && "email" in input
        ? (input as CreateUserInput)
        : validateCreateUser(input);

    const email = (validated.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new ValidationError("A valid email address is required");
    }
    if (!validated.password) {
      throw new ValidationError("Password is required");
    }
    const pwdVal = validatePasswordStrength(validated.password);
    if (!pwdVal.valid) {
      throw new ValidationError(pwdVal.error ?? "Invalid password");
    }

    const existing = await this.usersRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError("A user with this email address already exists");
    }

    const passwordHash = await hashPassword(validated.password, this.saltRounds);
    const user = await this.usersRepo.create({
      email,
      passwordHash,
      name: validated.name,
      roleIds: validated.roleIds || [],
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
      roleIds: user.roleIds,
      createdAt: user.createdAt,
    };
  }

  async updateUser(id: string, input: unknown | UpdateUserInput, actorId?: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const validated =
      typeof input === "object" && input !== null
        ? (input as UpdateUserInput)
        : validateUpdateUser(input);

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
      }
      patch.roleIds = validated.roleIds;
    }

    if (validated.password) {
      patch.passwordHash = await hashPassword(validated.password, this.saltRounds);
    }

    const updated = await this.usersRepo.update(id, patch);
    if (!updated) {
      throw new NotFoundError("User not found");
    }

    if (validated.password) {
      await this.sessionsRepo.deleteByUserId(id);
      this.logger.info("Revoked all sessions for user after password update", { userId: id });
    }

    await this.hooks.emit(EVENTS.AUTH.USER_UPDATED, { userId: id, actorId });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      roleIds: updated.roleIds,
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
    await this.sessionsRepo.deleteByUserId(id);

    await this.hooks.emit(EVENTS.AUTH.USER_DELETED, {
      userId: id,
      email: user.email,
      actorId,
    });
    this.logger.info("User deleted", { userId: id });
  }
}
