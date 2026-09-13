import type { FastifyReply, FastifyRequest } from "fastify";
import {
  validateCreateVaultItem,
  validateGeneratePassword,
  validateUpdateVaultItem,
} from "../domain/vault.rules.js";
import type { VaultService } from "../services/vaultService.js";

function getActorId(request: FastifyRequest): string | undefined {
  return (request as unknown as { user?: { id?: string } }).user?.id;
}

export class VaultController {
  private readonly service: VaultService;

  constructor(service: VaultService) {
    this.service = service;
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = request.query as { category?: string; search?: string };
    const items = await this.service.list(query.category, query.search);
    return reply.status(200).send({ items });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const item = await this.service.getById(id);
    return reply.status(200).send({ item });
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const validated = validateCreateVaultItem(request.body);
    const item = await this.service.create(validated, getActorId(request));
    return reply.status(201).send({ item });
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const validated = validateUpdateVaultItem(request.body);
    const item = await this.service.update(id, validated, getActorId(request));
    return reply.status(200).send({ item });
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    await this.service.delete(id, getActorId(request));
    return reply.status(200).send({ success: true, message: "Vault item deleted" });
  }

  async reveal(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const res = await this.service.revealPassword(id, getActorId(request));
    return reply.status(200).send(res);
  }

  async generatePassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const validated = validateGeneratePassword(request.body || {});
    const password = this.service.generatePassword(validated);
    return reply.status(200).send({ password });
  }
}
