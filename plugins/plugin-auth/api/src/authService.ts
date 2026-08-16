import type { HookManager, ILogger, SettingsService } from "@cms/core";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  buildPaginatedResult,
} from "@cms/core";
import { hashPassword, validatePasswordStrength, verifyPassword } from "./domain/password.rules.js";
import { AUTH_PERMISSIONS } from "./domain/permission.rules.js";
import type { RolesRepository } from "./repositories/rolesRepository.js";
import type { SessionsRepository } from "./repositories/sessionsRepository.js";
import type { UserDoc, UsersRepository } from "./repositories/usersRepository.js";
import type { SessionService } from "./sessionService.js";

export interface AuthResult {
  user: {
    id: string;
    email: string;
    roleIds: string[];
    permissions: string[];
    createdAt?: Date;
  };
  session: {
    token: string;
    csrfToken: string;
    expiresAt: Date;
    sessionId: string;
  };
}

export class AuthService {
  private readonly usersRepo: UsersRepository;
  private readonly rolesRepo: RolesRepository;
  private readonly sessionsRepo: SessionsRepository;
  private readonly sessionService: SessionService;
  private readonly settingsService: SettingsService;
  private readonly hooks: HookManager;
  private readonly logger: ILogger;
  private readonly saltRounds: number;
  private readonly passwordMinLength: number;
  private readonly setupEnabled: boolean;

  constructor(
    usersRepo: UsersRepository,
    rolesRepo: RolesRepository,
    sessionsRepo: SessionsRepository,
    sessionService: SessionService,
    settingsService: SettingsService,
    hooks: HookManager,
    logger: ILogger,
    saltRounds = 12,
    passwordMinLength = 8,
    setupEnabled = true,
  ) {
    this.usersRepo = usersRepo;
    this.rolesRepo = rolesRepo;
    this.sessionsRepo = sessionsRepo;
    this.sessionService = sessionService;
    this.settingsService = settingsService;
    this.hooks = hooks;
    this.logger = logger;
    this.saltRounds = saltRounds;
    this.passwordMinLength = passwordMinLength;
    this.setupEnabled = setupEnabled;
  }

  // ---------------------------------------------------------------------------
  // Validation Helpers
  // ---------------------------------------------------------------------------
  validateEmail(email: string): string {
    const sanitized = email.trim().toLowerCase();
    if (!sanitized || !sanitized.includes("@")) {
      throw new ValidationError("A valid email address is required");
    }
    return sanitized;
  }

  validatePassword(password: string): void {
    const val = validatePasswordStrength(password, this.passwordMinLength);
    if (!val.valid) {
      throw new ValidationError(val.error ?? "Invalid password");
    }
  }

  // ---------------------------------------------------------------------------
  // Session & Permissions Helper
  // ---------------------------------------------------------------------------
  private async createAuthResult(
    user: UserDoc,
    meta: { userAgent?: string | undefined; ip?: string | undefined },
  ): Promise<AuthResult> {
    const roles = await this.rolesRepo.findByIds(user.roleIds || []);
    const rolePermissions = roles.flatMap((r) => r.permissions || []);
    const directPermissions = user.permissions || [];
    const permissions = Array.from(new Set([...rolePermissions, ...directPermissions]));

    const session = await this.sessionService.createSession(user.id, permissions, meta);

    return {
      user: {
        id: user.id,
        email: user.email,
        roleIds: user.roleIds,
        permissions,
        createdAt: user.createdAt,
      },
      session,
    };
  }

  // ---------------------------------------------------------------------------
  // Setup Wizard
  // ---------------------------------------------------------------------------
  async getSetupStatus(): Promise<{ needsSetup: boolean; setupEnabled: boolean }> {
    if (!this.setupEnabled) {
      return { needsSetup: false, setupEnabled: false };
    }
    const isCompleted = await this.settingsService.get<boolean>("auth.setupCompleted", false);
    if (isCompleted) {
      return { needsSetup: false, setupEnabled: true };
    }
    const userCount = await this.usersRepo.count();
    return { needsSetup: userCount === 0, setupEnabled: true };
  }

  async setup(
    emailRaw: string,
    passwordRaw: string,
    meta: { userAgent?: string | undefined; ip?: string | undefined } = {},
  ): Promise<AuthResult> {
    if (!this.setupEnabled) {
      throw new ForbiddenError("Setup is disabled in environment configuration");
    }

    const isCompleted = await this.settingsService.get<boolean>("auth.setupCompleted", false);
    const userCount = await this.usersRepo.count();
    if (isCompleted || userCount > 0) {
      await this.settingsService.set("auth.setupCompleted", true);
      throw new ForbiddenError("Setup has already been completed");
    }

    const email = this.validateEmail(emailRaw);
    this.validatePassword(passwordRaw);

    let adminRole = await this.rolesRepo.findByName("admin");
    if (!adminRole) {
      adminRole = await this.rolesRepo.create({ name: "admin", permissions: ["*"] });
    }
    const roleIds = [adminRole.id];
    const passwordHash = await hashPassword(passwordRaw, this.saltRounds);
    const user = await this.usersRepo.create({ email, passwordHash, roleIds });

    await this.settingsService.set("auth.setupCompleted", true);
    await this.hooks.emit("user.created", { userId: user.id, email: user.email });
    this.logger.info("Initial admin account created via setup wizard", { email: user.email });

    return this.createAuthResult(user, meta);
  }

  // ---------------------------------------------------------------------------
  // Registration & Login
  // ---------------------------------------------------------------------------
  async register(
    emailRaw: string,
    passwordRaw: string,
    meta: { userAgent?: string | undefined; ip?: string | undefined } = {},
  ): Promise<AuthResult> {
    const registrationEnabled = await this.settingsService.get<boolean>(
      "auth.registrationEnabled",
      true,
    );
    if (!registrationEnabled) {
      throw new ForbiddenError("Registration is currently disabled");
    }

    const email = this.validateEmail(emailRaw);
    this.validatePassword(passwordRaw);

    const existing = await this.usersRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError("A user with this email address already exists");
    }

    const passwordHash = await hashPassword(passwordRaw, this.saltRounds);
    const user = await this.usersRepo.create({ email, passwordHash, roleIds: [] });

    await this.hooks.emit("user.created", { userId: user.id, email: user.email });
    return this.createAuthResult(user, meta);
  }

  async login(
    emailRaw: string,
    passwordRaw: string,
    meta: { userAgent?: string | undefined; ip?: string | undefined } = {},
  ): Promise<AuthResult> {
    const email = this.validateEmail(emailRaw);
    if (!passwordRaw) {
      throw new ValidationError("Password is required");
    }

    const user = await this.usersRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await verifyPassword(passwordRaw, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    return this.createAuthResult(user, meta);
  }

  async logout(sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.sessionService.revokeSession(sessionId);
    }
  }

  // ---------------------------------------------------------------------------
  // Sessions Management
  // ---------------------------------------------------------------------------
  async listSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.sessionsRepo.findByUserId(userId);
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      current: s.id === currentSessionId,
    }));
  }

  async deleteSession(
    sessionId: string,
    user: { id: string; permissions: string[] },
  ): Promise<void> {
    const session = await this.sessionsRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Session not found");
    }

    const isOwner = session.userId === user.id;
    const canManage =
      user.permissions.includes(AUTH_PERMISSIONS.USERS_WRITE) || user.permissions.includes("*");

    if (!isOwner && !canManage) {
      throw new ForbiddenError("You cannot revoke another user's session");
    }

    await this.sessionService.revokeSession(sessionId);
  }

  async revokeUserSessions(userId: string): Promise<void> {
    await this.sessionService.revokeUserSessions(userId);
  }

  async revokeAllSessions(): Promise<void> {
    await this.sessionService.revokeAllSessions();
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  async getRegistrationSetting(): Promise<boolean> {
    return this.settingsService.get<boolean>("auth.registrationEnabled", true);
  }

  async updateRegistrationSetting(registrationEnabled: boolean): Promise<void> {
    await this.settingsService.set("auth.registrationEnabled", registrationEnabled);
  }

  // ---------------------------------------------------------------------------
  // Users & Roles Management
  // ---------------------------------------------------------------------------
  async listUsers(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [users, total, roles] = await Promise.all([
      this.usersRepo.list(skip, limit),
      this.usersRepo.count(),
      this.rolesRepo.list(),
    ]);

    const sanitized = users.map((u) => {
      const primaryRole =
        roles.find((r) => u.roleIds?.includes(r.id) || u.roleIds?.includes(r.name))?.name ||
        (u.permissions?.includes("*") ? "admin" : "user");
      return {
        id: u.id,
        email: u.email,
        name: u.name || "",
        role: primaryRole,
        roleIds: u.roleIds || [],
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    });

    return buildPaginatedResult(sanitized, total, page, limit);
  }

  async getUser(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User '${id}' not found`);
    }
    const roles = await this.rolesRepo.list();
    const primaryRole =
      roles.find((r) => user.roleIds?.includes(r.id) || user.roleIds?.includes(r.name))?.name ||
      (user.permissions?.includes("*") ? "admin" : "user");
    return {
      id: user.id,
      email: user.email,
      name: user.name || "",
      role: primaryRole,
      roleIds: user.roleIds || [],
      permissions: user.permissions || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async createUser(
    emailRaw: string,
    passwordRaw: string,
    roleIds: string[] = [],
    name?: string | undefined,
    permissions?: string[] | undefined,
  ) {
    const email = this.validateEmail(emailRaw);
    this.validatePassword(passwordRaw);

    const existing = await this.usersRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError("A user with this email address already exists");
    }

    const passwordHash = await hashPassword(passwordRaw, this.saltRounds);
    const user = await this.usersRepo.create({
      email,
      passwordHash,
      roleIds,
      name,
      permissions,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleIds: user.roleIds,
      permissions: user.permissions,
      createdAt: user.createdAt,
    };
  }

  async updateUser(
    id: string,
    data: {
      email?: string | undefined;
      name?: string | undefined;
      role?: string | undefined;
      roleIds?: string[] | undefined;
      permissions?: string[] | undefined;
      password?: string | undefined;
    },
  ) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User '${id}' not found`);
    }

    const updates: Partial<Omit<UserDoc, "id" | "createdAt">> = {};
    if (data.email) {
      const email = this.validateEmail(data.email);
      const existing = await this.usersRepo.findByEmail(email);
      if (existing && existing.id !== id) {
        throw new ConflictError("A user with this email address already exists");
      }
      updates["email"] = email;
    }

    if (data.name !== undefined) {
      updates["name"] = data.name.trim();
    }

    if (data.password && data.password.trim().length > 0) {
      this.validatePassword(data.password);
      updates["passwordHash"] = await hashPassword(data.password, this.saltRounds);
    }

    if (data.role) {
      let roleDoc =
        (await this.rolesRepo.findByName(data.role)) || (await this.rolesRepo.findById(data.role));
      if (!roleDoc && (data.role === "admin" || data.role === "editor" || data.role === "user")) {
        roleDoc = await this.rolesRepo.create({ name: data.role, permissions: [] });
      }
      if (roleDoc) {
        updates["roleIds"] = [roleDoc.id];
      }
    } else if (data.roleIds) {
      updates["roleIds"] = data.roleIds;
    }

    if (data.permissions !== undefined) {
      updates["permissions"] = data.permissions;
    }

    await this.usersRepo.update(id, updates);
    return this.getUser(id);
  }

  async deleteUser(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User '${id}' not found`);
    }
    await this.usersRepo.deleteById(id);
    await this.sessionsRepo.deleteByUserId(id);
  }

  async listRoles() {
    return this.rolesRepo.list();
  }

  async getRole(id: string) {
    const role = (await this.rolesRepo.findById(id)) || (await this.rolesRepo.findByName(id));
    if (!role) {
      throw new NotFoundError(`Role '${id}' not found`);
    }
    return role;
  }

  async createRole(nameRaw: string, permissions: string[], description?: string | undefined) {
    const name = nameRaw.trim();
    if (!name) {
      throw new ValidationError("Role name is required");
    }

    const existing = await this.rolesRepo.findByName(name);
    if (existing) {
      throw new ConflictError(`Role '${name}' already exists`);
    }

    return this.rolesRepo.create({ name, description, permissions });
  }

  async updateRole(
    id: string,
    data: {
      name?: string | undefined;
      description?: string | undefined;
      permissions?: string[] | undefined;
    },
  ) {
    const role = (await this.rolesRepo.findById(id)) || (await this.rolesRepo.findByName(id));
    if (!role) {
      throw new NotFoundError(`Role '${id}' not found`);
    }

    const updated = await this.rolesRepo.update(role.id, data);
    return updated;
  }

  async deleteRole(id: string) {
    const role = (await this.rolesRepo.findById(id)) || (await this.rolesRepo.findByName(id));
    if (!role) {
      throw new NotFoundError(`Role '${id}' not found`);
    }
    if (role.isSystem) {
      throw new ForbiddenError("Cannot delete a system role");
    }
    await this.rolesRepo.deleteById(role.id);
  }
}
