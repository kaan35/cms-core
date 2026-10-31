import { parsePaginationQuery } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  validateCreateVaultItem,
  validateGeneratePassword,
  validateUpdateVaultItem,
  type CreateVaultItemInput,
  type GeneratePasswordInput,
  type UpdateVaultItemInput,
  type VaultFormatQuery,
  type VaultIdParam,
  type VaultImportInput,
  type VaultPreviewInput,
  type VaultQuery,
} from "../domain/vault.rules.js";
import type { VaultService } from "../services/vaultService.js";
import { parseVaultCsv, parseVaultXlsx } from "../utils/vaultExportUtils.js";

function getActorId(request: FastifyRequest): string | undefined {
  return request.user?.id;
}

export class VaultController {
  private readonly service: VaultService;

  constructor(service: VaultService) {
    this.service = service;
  }

  async list(
    request: FastifyRequest<{ Querystring: VaultQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { page, limit } = parsePaginationQuery(request.query);
    const search = request.query.search || request.query.q;
    const [paginated, categories] = await Promise.all([
      this.service.listPaginated(page, limit, request.query.category, search),
      this.service.getCategories(),
    ]);
    return reply.status(200).send({
      items: paginated.data,
      data: paginated.data,
      meta: paginated.meta,
      categories,
    });
  }

  async getById(
    request: FastifyRequest<{ Params: VaultIdParam }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params;
    const item = await this.service.getById(id);
    return reply.status(200).send({ item });
  }

  async create(
    request: FastifyRequest<{ Body: CreateVaultItemInput }>,
    reply: FastifyReply,
  ): Promise<void> {
    const validated = validateCreateVaultItem(request.body);
    const item = await this.service.create(validated, getActorId(request));
    return reply.status(201).send({ item });
  }

  async update(
    request: FastifyRequest<{ Params: VaultIdParam; Body: UpdateVaultItemInput }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params;
    const validated = validateUpdateVaultItem(request.body);
    const item = await this.service.update(id, validated, getActorId(request));
    return reply.status(200).send({ item });
  }

  async delete(
    request: FastifyRequest<{ Params: VaultIdParam }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params;
    await this.service.delete(id, getActorId(request));
    return reply.status(200).send({ success: true, message: "Vault item deleted" });
  }

  async reveal(
    request: FastifyRequest<{ Params: VaultIdParam }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = request.params;
    const res = await this.service.revealPassword(id, getActorId(request));
    return reply.status(200).send(res);
  }

  async generatePassword(
    request: FastifyRequest<{ Body: GeneratePasswordInput }>,
    reply: FastifyReply,
  ): Promise<void> {
    const validated = validateGeneratePassword(request.body || {});
    const password = this.service.generatePassword(validated);
    return reply.status(200).send({ password });
  }

  async template(
    request: FastifyRequest<{ Querystring: VaultFormatQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const format = request.query?.format === "csv" ? "csv" : "xlsx";
    const { data, mimeType, filename } = this.service.getTemplate(format);
    reply.header("Content-Type", mimeType);
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    return reply.send(data);
  }

  async export(
    request: FastifyRequest<{ Querystring: VaultFormatQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const format = request.query?.format === "csv" ? "csv" : "xlsx";
    const { data, mimeType, filename } = await this.service.exportItems(
      format,
      getActorId(request),
    );
    reply.header("Content-Type", mimeType);
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    return reply.send(data);
  }

  async preview(
    request: FastifyRequest<{ Body: VaultPreviewInput }>,
    reply: FastifyReply,
  ): Promise<void> {
    const body = request.body;
    let rawItems: Array<Record<string, string>> = [];

    if (body?.fileBase64 && typeof body.fileBase64 === "string") {
      const buf = Buffer.from(body.fileBase64.replace(/^data:.*?;base64,/, ""), "base64");
      const isXlsx =
        body.filename?.toLowerCase().endsWith(".xlsx") ||
        (buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50);
      rawItems = isXlsx ? parseVaultXlsx(buf) : parseVaultCsv(buf.toString("utf8"));
    } else if (body?.csv && typeof body.csv === "string") {
      rawItems = parseVaultCsv(body.csv);
    }

    const preview = this.service.previewItems(rawItems);
    return reply.status(200).send(preview);
  }

  async import(
    request: FastifyRequest<{ Body: VaultImportInput }>,
    reply: FastifyReply,
  ): Promise<void> {
    const body = request.body;
    let itemsToImport: unknown[];

    if (body?.fileBase64 && typeof body.fileBase64 === "string") {
      const buf = Buffer.from(body.fileBase64.replace(/^data:.*?;base64,/, ""), "base64");
      const isXlsx =
        body.filename?.toLowerCase().endsWith(".xlsx") ||
        (buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50);
      itemsToImport = isXlsx ? parseVaultXlsx(buf) : parseVaultCsv(buf.toString("utf8"));
    } else if (body?.csv && typeof body.csv === "string") {
      itemsToImport = parseVaultCsv(body.csv);
    } else if (Array.isArray(body?.items)) {
      itemsToImport = body.items;
    } else {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Must provide 'items' array, 'csv' string, or 'fileBase64'",
      });
    }

    const result = await this.service.importItems(itemsToImport, getActorId(request));
    return reply.status(200).send({
      success: true,
      count: result.importedCount,
      errors: result.errors,
    });
  }
}
