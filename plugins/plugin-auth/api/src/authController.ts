import { parsePaginationQuery, ValidationError } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "./authService.js";

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

  // ---------------------------------------------------------------------------
  // Cookie Management
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Setup Wizard
  // ---------------------------------------------------------------------------
  async getSetupStatus(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const status = await this.authService.getSetupStatus();
    return reply.send(status);
  }

  async setup(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as Record<string, unknown> | undefined;
    const email = typeof body?.["email"] === "string" ? body["email"] : "";
    const password = typeof body?.["password"] === "string" ? body["password"] : "";

    const result = await this.authService.setup(email, password, {
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

  // ---------------------------------------------------------------------------
  // Registration & Login
  // ---------------------------------------------------------------------------
  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as Record<string, unknown> | undefined;
    const email = typeof body?.["email"] === "string" ? body["email"] : "";
    const password = typeof body?.["password"] === "string" ? body["password"] : "";

    const result = await this.authService.register(email, password, {
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
    const body = request.body as Record<string, unknown> | undefined;
    const email = typeof body?.["email"] === "string" ? body["email"] : "";
    const password = typeof body?.["password"] === "string" ? body["password"] : "";

    const result = await this.authService.login(email, password, {
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
    await this.authService.logout(request.user?.sessionId);
    this.clearAuthCookies(reply);
    return reply.send({ ok: true });
  }

  async me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    return reply.send({ user: request.user });
  }

  // ---------------------------------------------------------------------------
  // Sessions Management
  // ---------------------------------------------------------------------------
  async listSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      return reply.status(401).send({ error: "Authentication required" });
    }
    const sessions = await this.authService.listSessions(request.user.id, request.user.sessionId);
    return reply.send({ sessions });
  }

  async deleteSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as { id: string };
    if (!request.user) {
      return reply.status(401).send({ error: "Authentication required" });
    }
    await this.authService.deleteSession(params.id, request.user);
    return reply.send({ ok: true });
  }

  async revokeUserSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as { id: string };
    await this.authService.revokeUserSessions(params.id);
    return reply.send({ ok: true });
  }

  async revokeAllSessions(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await this.authService.revokeAllSessions();
    return reply.send({ ok: true, message: "All active sessions system-wide have been revoked" });
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  async getSettings(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const registrationEnabled = await this.authService.getRegistrationSetting();
    return reply.send({ registrationEnabled });
  }

  async updateSettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as { registrationEnabled?: boolean } | undefined;
    if (typeof body?.registrationEnabled !== "boolean") {
      throw new ValidationError("registrationEnabled must be a boolean");
    }
    await this.authService.updateRegistrationSetting(body.registrationEnabled);
    return reply.send({ registrationEnabled: body.registrationEnabled });
  }

  // ---------------------------------------------------------------------------
  // Users & Roles Management
  // ---------------------------------------------------------------------------
  async listUsers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { page, limit } = parsePaginationQuery(request.query as Record<string, unknown>);
    const paginated = await this.authService.listUsers(page, limit);
    return reply.send(paginated);
  }

  async createUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as Record<string, unknown> | undefined;
    const email = typeof body?.["email"] === "string" ? body["email"] : "";
    const password = typeof body?.["password"] === "string" ? body["password"] : "";
    const roleIds = Array.isArray(body?.["roleIds"]) ? (body["roleIds"] as string[]) : [];

    const user = await this.authService.createUser(email, password, roleIds);
    return reply.status(201).send({ user });
  }

  async listRoles(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const roles = await this.authService.listRoles();
    return reply.send({ roles });
  }

  async createRole(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as Record<string, unknown> | undefined;
    const name = typeof body?.["name"] === "string" ? body["name"] : "";
    const permissions = Array.isArray(body?.["permissions"])
      ? (body["permissions"] as string[])
      : [];

    const role = await this.authService.createRole(name, permissions);
    return reply.status(201).send({ role });
  }
}
