import type { HookManager, ILogger, SettingsService } from "@cms/core";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@cms/core";
import { EVENTS } from "@cms/core";
import {
  type LoginInput,
  type RegisterInput,
  type SetupInput,
  validateLogin,
  validateRegister,
  validateSetup,
} from "../domain/auth.rules.js";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "../domain/password.rules.js";
import type { RolesRepository } from "../repositories/rolesRepository.js";
import type { SessionsRepository } from "../repositories/sessionsRepository.js";
import type { UserDoc, UsersRepository } from "../repositories/usersRepository.js";
import type { SessionService } from "../sessionService.js";

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name?: string | undefined;
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
        name: user.name,
        roleIds: user.roleIds,
        permissions,
        createdAt: user.createdAt,
      },
      session,
    };
  }

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

  private normalizeSetupInput(emailOrInput: string | unknown, passwordRaw?: string): SetupInput {
    if (typeof emailOrInput === "string") {
      return { email: emailOrInput, password: passwordRaw || "" };
    }
    return validateSetup(emailOrInput);
  }

  private normalizeRegisterInput(
    emailOrInput: string | unknown,
    passwordRaw?: string,
  ): RegisterInput {
    if (typeof emailOrInput === "string") {
      return { email: emailOrInput, password: passwordRaw || "" };
    }
    return validateRegister(emailOrInput);
  }

  private normalizeLoginInput(emailOrInput: string | unknown, passwordRaw?: string): LoginInput {
    if (typeof emailOrInput === "string") {
      return { email: emailOrInput, password: passwordRaw || "" };
    }
    return validateLogin(emailOrInput);
  }

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
    emailOrInput: string | unknown,
    passwordOrMeta?: string | { userAgent?: string | undefined; ip?: string | undefined },
    metaArg?: { userAgent?: string | undefined; ip?: string | undefined },
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

    const passwordStr = typeof passwordOrMeta === "string" ? passwordOrMeta : undefined;
    const meta = typeof passwordOrMeta === "object" ? passwordOrMeta : metaArg || {};

    const validated = this.normalizeSetupInput(emailOrInput, passwordStr);
    const email = this.validateEmail(validated.email);
    this.validatePassword(validated.password);

    let adminRole = await this.rolesRepo.findByName("admin");
    if (!adminRole) {
      adminRole = await this.rolesRepo.create({ name: "admin", permissions: ["*"] });
    }
    const roleIds = [adminRole.id];
    const passwordHash = await hashPassword(validated.password, this.saltRounds);
    const user = await this.usersRepo.create({
      email,
      name: validated.name,
      passwordHash,
      roleIds,
      permissions: ["*"],
    });

    await this.settingsService.set("auth.setupCompleted", true);
    if (validated.siteTitle) {
      await this.settingsService.set("siteTitle", validated.siteTitle);
    }

    await this.hooks.emit(EVENTS.AUTH.USER_CREATED, { userId: user.id, email: user.email });
    this.logger.info("Initial admin account created via setup wizard", { email: user.email });

    return this.createAuthResult(user, meta);
  }

  async register(
    emailOrInput: string | unknown,
    passwordOrMeta?: string | { userAgent?: string | undefined; ip?: string | undefined },
    metaArg?: { userAgent?: string | undefined; ip?: string | undefined },
  ): Promise<AuthResult> {
    const registrationEnabled = await this.settingsService.get<boolean>(
      "auth.registrationEnabled",
      true,
    );
    if (!registrationEnabled) {
      throw new ForbiddenError("Registration is currently disabled");
    }

    const passwordStr = typeof passwordOrMeta === "string" ? passwordOrMeta : undefined;
    const meta = typeof passwordOrMeta === "object" ? passwordOrMeta : metaArg || {};

    const validated = this.normalizeRegisterInput(emailOrInput, passwordStr);
    const email = this.validateEmail(validated.email);
    this.validatePassword(validated.password);

    const existing = await this.usersRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError("A user with this email address already exists");
    }

    const passwordHash = await hashPassword(validated.password, this.saltRounds);
    const user = await this.usersRepo.create({
      email,
      name: validated.name,
      passwordHash,
      roleIds: [],
    });

    await this.hooks.emit(EVENTS.AUTH.USER_CREATED, { userId: user.id, email: user.email });
    return this.createAuthResult(user, meta);
  }

  async login(
    emailOrInput: string | unknown,
    passwordOrMeta?: string | { userAgent?: string | undefined; ip?: string | undefined },
    metaArg?: { userAgent?: string | undefined; ip?: string | undefined },
  ): Promise<AuthResult> {
    const passwordStr = typeof passwordOrMeta === "string" ? passwordOrMeta : undefined;
    const meta = typeof passwordOrMeta === "object" ? passwordOrMeta : metaArg || {};

    const validated = this.normalizeLoginInput(emailOrInput, passwordStr);
    const email = this.validateEmail(validated.email);
    if (!validated.password) {
      throw new ValidationError("Password is required");
    }

    const user = await this.usersRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await verifyPassword(validated.password, user.passwordHash);
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

    const isOwn = session.userId === user.id;
    const canManageAll = user.permissions.includes("*") || user.permissions.includes("users:write");

    if (!isOwn && !canManageAll) {
      throw new ForbiddenError("You can only delete your own sessions");
    }

    await this.sessionService.revokeSession(sessionId);
  }

  async revokeAllUserSessions(userId: string, actorId?: string): Promise<number> {
    const targetUser = await this.usersRepo.findById(userId);
    if (!targetUser) {
      throw new NotFoundError("User not found");
    }
    const count = await this.sessionsRepo.deleteByUserId(userId);
    await this.hooks.emit(EVENTS.AUTH.SESSION_REVOKED, { userId, count, actorId });
    this.logger.info("Admin revoked all sessions for user", { userId, count, actorId });
    return count;
  }

  async revokeAllSessions(actorId?: string): Promise<number> {
    const count = await this.sessionsRepo.deleteAll();
    await this.hooks.emit(EVENTS.AUTH.SESSION_REVOKED, { all: true, count, actorId });
    this.logger.warn("PANIC: Revoked all active sessions across entire system", { count, actorId });
    return count;
  }

  async getRegistrationSetting(): Promise<boolean> {
    return this.settingsService.get<boolean>("auth.registrationEnabled", true);
  }

  async setRegistrationSetting(enabled: boolean, actorId?: string): Promise<void> {
    await this.settingsService.set("auth.registrationEnabled", enabled);
    this.logger.info("Updated registrationEnabled setting", { enabled, actorId });
  }
}
