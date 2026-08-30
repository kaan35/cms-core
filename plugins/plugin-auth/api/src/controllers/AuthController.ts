import type { FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { validateUpdateAuthSettings } from "../domain/auth.rules.js";
import type { AuthService } from "../services/AuthService.js";

export class AuthController {
  private readonly authService: AuthService;
  private readonly cookieDomain?: string | undefined;
  private readonly cookieSameSite: "lax" | "strict" | "none";
  private readonly cookieSecure: boolean;

  constructor(
    authService: AuthService,
    isProduction = false,
    cookieDomain?: string | undefined,
    cookieSameSite: "lax" | "strict" | "none" = "lax",
    cookieSecure?: boolean | undefined,
  ) {
    this.authService = authService;
    this.cookieDomain = cookieDomain;
    this.cookieSameSite = cookieSameSite;
    this.cookieSecure = cookieSecure ?? isProduction;
  }

  private setAuthCookies(
    reply: FastifyReply,
    token: string,
    csrfToken: string,
    expiresAt: Date,
  ): void {
    const maxAgeSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    const domainOpt = this.cookieDomain ? { domain: this.cookieDomain } : {};

    reply.setCookie("token", token, {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: this.cookieSameSite,
      path: "/",
      maxAge: maxAgeSeconds,
      ...domainOpt,
    });

    reply.setCookie("csrfToken", csrfToken, {
      httpOnly: false,
      secure: this.cookieSecure,
      sameSite: this.cookieSameSite,
      path: "/",
      maxAge: maxAgeSeconds,
      ...domainOpt,
    });
  }

  private clearAuthCookies(reply: FastifyReply): void {
    const domainOpt = this.cookieDomain ? { domain: this.cookieDomain } : {};
    reply.clearCookie("token", { path: "/", ...domainOpt });
    reply.clearCookie("csrfToken", { path: "/", ...domainOpt });
  }

  async getSetupStatus(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const status = await this.authService.getSetupStatus();
    return reply.send(status);
  }

  async setup(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.authService.setup(request.body, {
      userAgent: request.headers["user-agent"],
      ip: request.ip,
    });

    this.setAuthCookies(
      reply,
      result.session.token,
      result.session.csrfToken,
      result.session.expiresAt,
    );

    return reply.status(201).send({
      user: result.user,
      token: result.session.token,
      csrfToken: result.session.csrfToken,
    });
  }

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.authService.register(request.body, {
      userAgent: request.headers["user-agent"],
      ip: request.ip,
    });

    this.setAuthCookies(
      reply,
      result.session.token,
      result.session.csrfToken,
      result.session.expiresAt,
    );

    return reply.status(201).send({
      user: result.user,
      token: result.session.token,
      csrfToken: result.session.csrfToken,
    });
  }

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.authService.login(request.body, {
      userAgent: request.headers["user-agent"],
      ip: request.ip,
    });

    this.setAuthCookies(
      reply,
      result.session.token,
      result.session.csrfToken,
      result.session.expiresAt,
    );

    return reply.send({
      user: result.user,
      token: result.session.token,
      csrfToken: result.session.csrfToken,
    });
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const sessionId = request.session?.id;
    await this.authService.logout(sessionId);
    this.clearAuthCookies(reply);
    return reply.send({ ok: true });
  }

  async me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ message: "Unauthorized" });
    }
    return reply.send({ user });
  }

  async getCsrfToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    let csrfToken = request.cookies["csrfToken"];
    if (!csrfToken) {
      csrfToken = crypto.randomBytes(32).toString("hex");
      const domainOpt = this.cookieDomain ? { domain: this.cookieDomain } : {};
      reply.setCookie("csrfToken", csrfToken, {
        httpOnly: false,
        secure: this.cookieSecure,
        sameSite: this.cookieSameSite,
        path: "/",
        ...domainOpt,
      });
    }
    return reply.send({ csrfToken });
  }

  async listSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }
    const currentSessionId = request.session?.id;
    const sessions = await this.authService.listSessions(userId, currentSessionId);
    return reply.send({ sessions });
  }

  async deleteSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ message: "Unauthorized" });
    }
    await this.authService.deleteSession(id, user);
    return reply.send({ ok: true });
  }

  async revokeAllUserSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const count = await this.authService.revokeAllUserSessions(id, request.user?.id);
    return reply.send({ ok: true, count });
  }

  async revokeAllSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const count = await this.authService.revokeAllSessions(request.user?.id);
    return reply.send({ ok: true, count });
  }

  async getRegistrationSetting(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const enabled = await this.authService.getRegistrationSetting();
    return reply.send({ registrationEnabled: enabled });
  }

  async updateRegistrationSetting(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { registrationEnabled } = validateUpdateAuthSettings(request.body);
    await this.authService.setRegistrationSetting(registrationEnabled, request.user?.id);
    return reply.send({ registrationEnabled });
  }
}
