import type { AuthUser, ILogger } from "@cms/core";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@cms/core";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type { SessionsRepository } from "./repositories/sessionsRepository.js";

export interface TokenPayload {
  userId: string;
  sessionId: string;
  permissions: string[];
}

export interface ISessionInfo {
  id: string;
  userAgent?: string | undefined;
  ip?: string | undefined;
  expiresAt: Date;
  createdAt?: Date | undefined;
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
  listUserSessions(userId: string, currentSessionId?: string): Promise<ISessionInfo[]>;
  deleteUserSession(sessionId: string, user: { id: string; permissions: string[] }): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
  revokeUserSessions(userId: string): Promise<void>;
  revokeAllSessions(): Promise<void>;
}

export class SessionService implements ISessionService {
  private readonly sessionsRepo: SessionsRepository;
  private readonly jwtSecret: string;
  private readonly logger: ILogger;
  private readonly sessionTtlMs: number;
  private readonly slideThresholdMs: number;

  constructor(
    sessionsRepo: SessionsRepository,
    jwtSecret: string,
    logger: ILogger,
    sessionTtlHours = 24,
    slideThresholdMinutes = 15,
  ) {
    if (!jwtSecret || typeof jwtSecret !== "string" || jwtSecret.length < 32) {
      throw new Error("JWT_SECRET is required and must be at least 32 characters long");
    }
    this.sessionsRepo = sessionsRepo;
    this.jwtSecret = jwtSecret;
    this.logger = logger;
    this.sessionTtlMs = sessionTtlHours * 60 * 60 * 1000;
    this.slideThresholdMs = slideThresholdMinutes * 60 * 1000;
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
      payload = jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch {
      throw new UnauthorizedError("Invalid or expired authentication token");
    }

    const session = await this.sessionsRepo.findById(payload.sessionId);
    if (!session) {
      throw new UnauthorizedError("Session has been revoked or expired");
    }

    const now = Date.now();
    const expiresAtMs = session.expiresAt.getTime();
    if (expiresAtMs <= now) {
      await this.sessionsRepo.delete(session.id);
      throw new UnauthorizedError("Session has expired");
    }

    // Sliding expiry: if less than threshold milliseconds remain, slide expiry forward
    if (expiresAtMs - now < this.slideThresholdMs) {
      const newExpiresAt = new Date(now + this.sessionTtlMs);
      await this.sessionsRepo.updateExpiresAt(session.id, newExpiresAt);
      this.logger.debug("Session expiry slid forward", { sessionId: session.id });
    }

    return {
      id: payload.userId,
      email: "",
      permissions: payload.permissions,
      sessionId: session.id,
    };
  }

  async listUserSessions(userId: string, currentSessionId?: string) {
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

  async deleteUserSession(
    sessionId: string,
    user: { id: string; permissions: string[] },
  ): Promise<void> {
    const session = await this.sessionsRepo.findById(sessionId);
    if (!session) throw new NotFoundError("Session not found");
    const isOwn = session.userId === user.id;
    const canManageAll = user.permissions.includes("*") || user.permissions.includes("users:write");
    if (!isOwn && !canManageAll) {
      throw new ForbiddenError("You can only delete your own sessions");
    }
    await this.revokeSession(sessionId);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionsRepo.delete(sessionId);
    this.logger.info("Session revoked", { sessionId });
  }

  async revokeUserSessions(userId: string): Promise<void> {
    await this.sessionsRepo.deleteByUserId(userId);
    this.logger.info("All user sessions revoked", { userId });
  }

  async revokeAllSessions(): Promise<void> {
    await this.sessionsRepo.deleteAll();
    this.logger.warn("All sessions system-wide revoked");
  }
}
