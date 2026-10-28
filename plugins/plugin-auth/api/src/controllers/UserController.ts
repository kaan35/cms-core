import { NotFoundError, parsePaginationQuery } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserService } from "../services/UserService.js";
import type { ISessionService } from "../sessionService.js";

export class UserController {
  private readonly userService: UserService;
  private readonly sessionService?: ISessionService | undefined;

  constructor(userService: UserService, sessionService?: ISessionService) {
    this.userService = userService;
    this.sessionService = sessionService;
  }

  async listUsers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { page, limit } = parsePaginationQuery(request.query);
    const query = (request.query || {}) as Record<string, string | undefined>;
    const search = query["search"]?.trim();
    const statusVal = query["status"];
    const status = statusVal === "active" || statusVal === "suspended" ? statusVal : undefined;
    const role = query["role"]?.trim();
    const result = await this.userService.listUsers(page, limit, { search, status, role });
    return reply.send(result);
  }

  async getUserById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const user = await this.userService.getUserById(id);
    return reply.send({ user });
  }

  async createUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = await this.userService.createUser(request.body, request.user?.id);
    return reply.status(201).send({ user });
  }

  async updateUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const user = await this.userService.updateUser(id, request.body, request.user?.id);
    return reply.send({ user });
  }

  async deleteUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const currentUserId = request.user?.id || "";
    await this.userService.deleteUser(id, currentUserId, request.user?.id);
    return reply.send({ ok: true });
  }

  async listUserSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    if (!this.sessionService) {
      return reply.send({ sessions: [] });
    }
    const currentSessionId = request.user?.sessionId;
    const sessions = await this.sessionService.listUserSessions(id, currentSessionId, true);
    return reply.send({ sessions });
  }

  async revokeUserSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id, sessionId } = request.params as { id: string; sessionId: string };
    if (this.sessionService) {
      const session = await this.sessionService.getSession(sessionId);
      if (session && session.userId !== id) {
        throw new NotFoundError("Session not found for this user");
      }
      await this.sessionService.revokeSession(sessionId, request.user?.id, "admin_revoked");
    }
    return reply.send({ ok: true });
  }

  async revokeAllUserSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    if (this.sessionService) {
      await this.sessionService.revokeUserSessions(id, request.user?.id, "admin_revoked");
    }
    return reply.send({ ok: true });
  }
}
