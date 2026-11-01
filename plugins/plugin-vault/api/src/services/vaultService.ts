import { NotFoundError, buildPaginatedResult, type IHookManager, type ILogger } from "@cms/core";
import { randomInt } from "node:crypto";
import {
  VAULT_EVENTS,
  type CreateVaultItemInput,
  type GeneratePasswordInput,
  type UpdateVaultItemInput,
  type VaultItemDoc,
} from "../domain/vault.rules.js";
import type { VaultRepository } from "../repositories/vaultRepository.js";
import { generateVaultCsv, generateVaultXlsx } from "../utils/vaultExportUtils.js";
import { decryptVaultPassword, deriveVaultKey, encryptVaultPassword } from "./vaultCipher.js";
import { VaultTransferService } from "./vaultTransferService.js";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

export class VaultService {
  private readonly repo: VaultRepository;
  private readonly hooks: IHookManager;
  private readonly logger: ILogger;
  private readonly encryptionKey: Buffer;
  private readonly transferService: VaultTransferService;

  constructor(
    repo: VaultRepository,
    hooks: IHookManager,
    logger: ILogger,
    secretKey?: string | Buffer,
  ) {
    this.repo = repo;
    this.hooks = hooks;
    this.logger = logger;
    if (Buffer.isBuffer(secretKey)) {
      if (secretKey.length === 0) {
        throw new Error("VAULT_SECRET buffer must not be empty");
      }
      this.encryptionKey = secretKey;
    } else {
      const secret =
        typeof secretKey === "string" && secretKey.length > 0
          ? secretKey
          : process.env["VAULT_SECRET"];
      if (!secret || typeof secret !== "string" || secret.length < 32) {
        throw new Error("VAULT_SECRET is required and must be at least 32 characters long");
      }
      this.encryptionKey = deriveVaultKey(secret);
    }
    this.transferService = new VaultTransferService(repo, hooks, logger, this.encryptionKey);
  }

  generatePassword(options: GeneratePasswordInput = {}): string {
    const length = options.length ?? 16;
    let pool = "";
    if (options.uppercase !== false) pool += UPPERCASE;
    if (options.lowercase !== false) pool += LOWERCASE;
    if (options.numbers !== false) pool += NUMBERS;
    if (options.symbols !== false) pool += SYMBOLS;

    if (pool.length === 0) {
      pool = LOWERCASE + NUMBERS;
    }

    let password = "";
    for (let i = 0; i < length; i++) {
      const idx = randomInt(0, pool.length);
      password += pool[idx];
    }
    return password;
  }

  private maskItem(item: VaultItemDoc): VaultItemDoc {
    return {
      ...item,
      password: "••••••••",
    };
  }

  async list(category?: string, search?: string): Promise<VaultItemDoc[]> {
    const items = await this.repo.list(category, search);
    return items.map((item) => this.maskItem(item));
  }

  async listPaginated(page = 1, limit = 20, category?: string, search?: string) {
    const [{ items, total }, stats] = await Promise.all([
      this.repo.findPaginated(page, limit, category, search),
      this.repo.getStats(),
    ]);
    const masked = items.map((it) => this.maskItem(it));
    return buildPaginatedResult(masked, total, page, limit, stats);
  }

  async getCategories(): Promise<string[]> {
    return this.repo.getCategories();
  }

  async getById(id: string): Promise<VaultItemDoc> {
    const item = await this.repo.findById(id);
    if (!item) {
      throw new NotFoundError(`Vault item "${id}" not found`);
    }
    return {
      ...item,
      password: "••••••••",
    };
  }

  async revealPassword(id: string, actorId?: string): Promise<{ password: string }> {
    const item = await this.repo.findById(id);
    if (!item) {
      throw new NotFoundError(`Vault item "${id}" not found`);
    }

    this.logger.info("Vault password revealed", { itemId: id, actorId });
    await this.hooks.emit(VAULT_EVENTS.REVEALED, {
      itemId: id,
      title: item.title,
      actorId,
      timestamp: new Date(),
    });

    const decrypted = decryptVaultPassword(item.password, this.encryptionKey);
    return { password: decrypted };
  }

  async create(input: CreateVaultItemInput, actorId?: string): Promise<VaultItemDoc> {
    const encryptedInput: CreateVaultItemInput = {
      ...input,
      password: encryptVaultPassword(input.password, this.encryptionKey),
    };
    const item = await this.repo.create(encryptedInput);
    this.logger.info("Vault item created", { id: item.id, title: item.title, actorId });
    await this.hooks.emit(VAULT_EVENTS.CREATED, { item, actorId });
    return {
      ...item,
      password: "••••••••",
    };
  }

  async update(id: string, input: UpdateVaultItemInput, actorId?: string): Promise<VaultItemDoc> {
    const updatePayload: UpdateVaultItemInput = { ...input };
    if (input.password) {
      updatePayload.password = encryptVaultPassword(input.password, this.encryptionKey);
    }
    const item = await this.repo.update(id, updatePayload);
    if (!item) {
      throw new NotFoundError(`Vault item "${id}" not found`);
    }
    this.logger.info("Vault item updated", { id, actorId });
    await this.hooks.emit(VAULT_EVENTS.UPDATED, { item, actorId });
    return {
      ...item,
      password: "••••••••",
    };
  }

  async delete(id: string, actorId?: string): Promise<boolean> {
    const success = await this.repo.delete(id);
    if (!success) {
      throw new NotFoundError(`Vault item "${id}" not found`);
    }
    this.logger.info("Vault item deleted", { id, actorId });
    await this.hooks.emit(VAULT_EVENTS.DELETED, { id, actorId });
    return true;
  }

  getTemplate(format: "xlsx" | "csv" = "xlsx"): {
    data: Buffer | string;
    mimeType: string;
    filename: string;
  } {
    const headers = ["Title", "Username", "Password", "URL", "Category", "Notes"];
    const sampleRows = [
      [
        "Example Service",
        "user@example.com",
        "P@ssw0rd123!",
        "https://example.com",
        "General",
        "Sample note",
      ],
    ];

    if (format === "csv") {
      return {
        data: generateVaultCsv(headers, sampleRows),
        mimeType: "text/csv; charset=utf-8",
        filename: "vault-template.csv",
      };
    }

    return {
      data: generateVaultXlsx(headers, sampleRows, "VaultTemplate"),
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "vault-template.xlsx",
    };
  }

  async exportItems(
    format: "xlsx" | "csv" = "xlsx",
    actorId?: string,
  ): Promise<{ data: Buffer | string; mimeType: string; filename: string }> {
    return this.transferService.exportItems(format, actorId);
  }

  async importItems(
    rawItems: unknown[],
    actorId?: string,
  ): Promise<{ importedCount: number; errors: Array<{ row: number; error: string }> }> {
    return this.transferService.importItems(rawItems, actorId);
  }

  previewItems(rawItems: unknown[]) {
    return this.transferService.previewItems(rawItems);
  }
}
