import type { AuthUser, IHookManager, ILogger } from "@cms/core";
import { EVENTS, ForbiddenError, NotFoundError, UnauthorizedError } from "@cms/core";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type {
  SessionDoc,
  SessionRevokeReason,
  SessionStatus,
  SessionsRepository,
} from "./repositories/sessionsRepository.js";

export interface TokenPayload {
  userId: string;
  sessionId: string;
  permissions: string[];
}

export interface ISessionInfo {
  id: string;
  userAgent?: string | undefined;
  ip?: string | undefined;
  status: SessionStatus;
  expiresAt: Date;
  createdAt?: Date | undefined;
  lastActiveAt?: Date | undefined;
  refreshCount?: number | undefined;
  revokedAt?: Date | undefined;
  revokedBy?: string | undefined;
  revokeReason?: SessionRevokeReason | undefined;
  current?: boolean | undefined;
}

export interface ISessionService {
  generateCsrfToken(): string;
  createSession(
    userId: string,
    permissions: string[],
    options?: { userAgent?: string | undefined; ip?: string | undefined },
  ): Promise<{ token: string; csrfToken: string; expiresAt: Date; sessionId: string }>;
  validateAndSlideSession(token: string): Promise<AuthUser>;
  listUserSessions(
    userId: string,
    currentSessionId?: string,
    includeHistory?: boolean,
  ): Promise<ISessionInfo[]>;
  deleteUserSession(
    sessionId: string,
    user: { id: string; permissions: string[] },
    reason?: SessionRevokeReason,
  ): Promise<void>;
  revokeSession(sessionId: string, revokedBy?: string, reason?: SessionRevokeReason): Promise<void>;
  revokeUserSessions(
    userId: string,
    revokedBy?: string,
    reason?: SessionRevokeReason,
  ): Promise<void>;
  revokeAllSessions(revokedBy?: string, reason?: SessionRevokeReason): Promise<void>;
  getSession(sessionId: string): Promise<SessionDoc | null>;
}

export class SessionService implements ISessionService {
  private readonly sessionsRepo: SessionsRepository;
  private readonly jwtSecret: string;
  private readonly logger: ILogger;
  private readonly sessionTtlMs: number;
  private readonly slideThresholdMs: number;
  private readonly hooks?: IHookManager | undefined;

  constructor(
    sessionsRepo: SessionsRepository,
    jwtSecret: string,
    logger: ILogger,
    sessionTtlHours = 24,
    slideThresholdMinutes = 15,
    hooks?: IHookManager,
  ) {
    if (!jwtSecret || typeof jwtSecret !== "string" || jwtSecret.length < 32) {
      throw new Error("JWT_SECRET is required and must be at least 32 characters long");
    }
    this.sessionsRepo = sessionsRepo;
    this.jwtSecret = jwtSecret;
    this.logger = logger;
    this.sessionTtlMs = sessionTtlHours * 60 * 60 * 1000;
    this.slideThresholdMs = slideThresholdMinutes * 60 * 1000;
    this.hooks = hooks;
  }

  generateCsrfToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async createSession(
    userId: string,
    permissions: string[],
    options: { userAgent?: string | undefined; ip?: string | undefined } = {},
  ): Promise<{ token: string; csrfToken: string; expiresAt: Date; sessionId: string }> {
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);
    const session = await this.sessionsRepo.create({
      userId,
      expiresAt,
      userAgent: options.userAgent,
      ip: options.ip,
    });

    const payload: TokenPayload = {
      userId,
      sessionId: session.id,
      permissions,
    };

    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: Math.floor(this.sessionTtlMs / 1000),
      algorithm: "HS256",
    });

    const csrfToken = this.generateCsrfToken();

    return {
      token,
      csrfToken,
      expiresAt,
      sessionId: session.id,
    };
  }

  async validateAndSlideSession(token: string): Promise<AuthUser> {
    let payload: TokenPayload;
    try {
      // Pin allowed signing algorithm to prevent 'alg: none' and algorithm-confusion attacks.
      payload = jwt.verify(token, this.jwtSecret, { algorithms: ["HS256"] }) as TokenPayload;
    } catch {
      throw new UnauthorizedError("Invalid or expired authentication token");
    }

    const session = await this.sessionsRepo.findById(payload.sessionId);
    if (!session || session.status !== "active") {
      throw new UnauthorizedError("Session has been revoked or expired");
    }

    if (session.userId !== payload.userId) {
      throw new UnauthorizedError("Session does not belong to user");
    }

    const now = Date.now();
    const expiresAtMs = session.expiresAt.getTime();
    if (expiresAtMs <= now) {
      await this.sessionsRepo.markExpired(session.id);
      throw new UnauthorizedError("Session has expired");
    }

    // Sliding expiry: if less than threshold milliseconds remain, slide expiry forward
    if (expiresAtMs - now < this.slideThresholdMs) {
      const newExpiresAt = new Date(now + this.sessionTtlMs);
      await this.sessionsRepo.updateSlide(session.id, newExpiresAt);
      this.logger.debug("Session expiry slid forward", {
        sessionId: session.id,
        userId: payload.userId,
      });
      if (this.hooks) {
        await this.hooks.emit(EVENTS.AUTH.SESSION_REFRESHED, {
          sessionId: session.id,
          userId: payload.userId,
          expiresAt: newExpiresAt,
        });
      }
    }

    return {
      id: payload.userId,
      email: "",
      permissions: payload.permissions,
      sessionId: session.id,
    };
  }

  async listUserSessions(
    userId: string,
    currentSessionId?: string,
    includeHistory = false,
  ): Promise<ISessionInfo[]> {
    const sessions = await this.sessionsRepo.findByUserId(userId, {
      includeRevoked: includeHistory,
    });
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      status: s.status,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      refreshCount: s.refreshCount,
      revokedAt: s.revokedAt,
      revokedBy: s.revokedBy,
      revokeReason: s.revokeReason,
      current: s.id === currentSessionId,
    }));
  }

  async deleteUserSession(
    sessionId: string,
    user: { id: string; permissions: string[] },
    reason: SessionRevokeReason = "self_revoked",
  ): Promise<void> {
    const session = await this.sessionsRepo.findById(sessionId);
    if (!session) throw new NotFoundError("Session not found");
    const isOwn = session.userId === user.id;
    const canManageAll = user.permissions.includes("*") || user.permissions.includes("users:write");
    if (!isOwn && !canManageAll) {
      throw new ForbiddenError("You can only delete your own sessions");
    }
    const finalReason = isOwn ? reason : "admin_revoked";
    await this.revokeSession(sessionId, user.id, finalReason);
  }

  async revokeSession(
    sessionId: string,
    revokedBy?: string,
    reason: SessionRevokeReason = "self_revoked",
  ): Promise<void> {
    await this.sessionsRepo.revoke(sessionId, revokedBy, reason);
    this.logger.info("Session revoked", { sessionId, revokedBy, reason });
    if (this.hooks) {
      await this.hooks.emit(EVENTS.AUTH.SESSION_REVOKED, {
        sessionId,
        actorId: revokedBy,
        reason,
      });
    }
  }

  async revokeUserSessions(
    userId: string,
    revokedBy?: string,
    reason: SessionRevokeReason = "admin_revoked",
  ): Promise<void> {
    await this.sessionsRepo.revokeByUserId(userId, revokedBy, reason);
    this.logger.info("All user sessions revoked", { userId, revokedBy, reason });
    if (this.hooks) {
      await this.hooks.emit(EVENTS.AUTH.SESSION_REVOKED, {
        userId,
        actorId: revokedBy,
        reason,
      });
    }
  }

  async revokeAllSessions(
    revokedBy?: string,
    reason: SessionRevokeReason = "panic_revoke_all",
  ): Promise<void> {
    await this.sessionsRepo.revokeAll(revokedBy, reason);
    this.logger.warn("All sessions system-wide revoked", { actorId: revokedBy, reason });
    if (this.hooks) {
      await this.hooks.emit(EVENTS.AUTH.SESSION_REVOKED, {
        all: true,
        actorId: revokedBy,
        reason,
      });
    }
  }

  async getSession(sessionId: string): Promise<SessionDoc | null> {
    return this.sessionsRepo.findById(sessionId);
  }
}
