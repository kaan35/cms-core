import type { AuthUser, ILogger } from "@cms/core";
import { UnauthorizedError } from "@cms/core";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type { SessionsRepository } from "./repositories/sessionsRepository.js";

export interface TokenPayload {
  userId: string;
  sessionId: string;
  permissions: string[];
}

export class SessionService {
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
