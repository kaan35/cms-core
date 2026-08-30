import { parsePaginationQuery } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserService } from "../services/UserService.js";

export class UserController {
  private readonly userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  async listUsers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { page, limit } = parsePaginationQuery(request.query);
    const result = await this.userService.listUsers(page, limit);
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
}
