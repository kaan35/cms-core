import type { IHookManager, ILogger, ISettingsService } from "@cms/core";
import {
  ConflictError,
  EVENTS,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@cms/core";
import { hashPassword, verifyPassword } from "../domain/password.rules.js";
import type { RolesRepository } from "../repositories/rolesRepository.js";
import type { SessionsRepository } from "../repositories/sessionsRepository.js";
import type { UserDoc, UsersRepository } from "../repositories/usersRepository.js";
import type { ISessionService } from "../sessionService.js";
import {
  createAuthResult,
  normalizeLoginInput,
  normalizeRegisterInput,
  normalizeSetupInput,
  validateEmail,
  validatePassword,
  type AuthResult,
} from "./authNormalizer.js";

export type { AuthResult } from "./authNormalizer.js";

export class AuthService {
  private readonly usersRepo: UsersRepository;
  private readonly rolesRepo: RolesRepository;
  private readonly sessionService: ISessionService;
  private readonly settingsService: ISettingsService;
  private readonly hooks: IHookManager;
  private readonly logger: ILogger;
  private readonly saltRounds: number;
  private readonly passwordMinLength: number;
  private readonly setupEnabled: boolean;

  constructor(
    usersRepo: UsersRepository,
    rolesRepo: RolesRepository,
    _sessionsRepo: SessionsRepository,
    sessionService: ISessionService,
    settingsService: ISettingsService,
    hooks: IHookManager,
    logger: ILogger,
    saltRounds = 12,
    passwordMinLength = 8,
    setupEnabled = true,
  ) {
    this.usersRepo = usersRepo;
    this.rolesRepo = rolesRepo;
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
    return createAuthResult(user, this.rolesRepo, this.sessionService, meta);
  }

  validateEmail(email: string): string {
    return validateEmail(email);
  }

  validatePassword(password: string): void {
    validatePassword(password, this.passwordMinLength);
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

    const validated = normalizeSetupInput(emailOrInput, passwordStr);
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

    const validated = normalizeRegisterInput(emailOrInput, passwordStr);
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

    const validated = normalizeLoginInput(emailOrInput, passwordStr);
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
    if (sessionId) await this.sessionService.revokeSession(sessionId);
  }

  async listSessions(userId: string, currentSessionId?: string) {
    return this.sessionService.listUserSessions(userId, currentSessionId);
  }

  async deleteSession(
    sessionId: string,
    user: { id: string; permissions: string[] },
  ): Promise<void> {
    return this.sessionService.deleteUserSession(sessionId, user);
  }

  async revokeAllUserSessions(userId: string, actorId?: string): Promise<void> {
    const targetUser = await this.usersRepo.findById(userId);
    if (!targetUser) throw new NotFoundError("User not found");
    await this.sessionService.revokeUserSessions(userId);
    await this.hooks.emit(EVENTS.AUTH.SESSION_REVOKED, { userId, actorId });
    this.logger.info("Admin revoked all sessions for user", { userId, actorId });
  }

  async revokeAllSessions(actorId?: string): Promise<void> {
    await this.sessionService.revokeAllSessions();
    await this.hooks.emit(EVENTS.AUTH.SESSION_REVOKED, { all: true, actorId });
    this.logger.warn("PANIC: Revoked all active sessions across entire system", { actorId });
  }

  async getRegistrationSetting(): Promise<boolean> {
    return this.settingsService.get<boolean>("auth.registrationEnabled", true);
  }

  async setRegistrationSetting(enabled: boolean, actorId?: string): Promise<void> {
    await this.settingsService.set("auth.registrationEnabled", enabled);
    this.logger.info("Updated registrationEnabled setting", { enabled, actorId });
  }
}
