import { NotFoundError, type IHookManager, type ILogger } from "@cms/core";
import { randomInt } from "node:crypto";
import {
  VAULT_EVENTS,
  validateCreateVaultItem,
  type CreateVaultItemInput,
  type GeneratePasswordInput,
  type UpdateVaultItemInput,
  type VaultItemDoc,
} from "../domain/vault.rules.js";
import type { VaultRepository } from "../repositories/vaultRepository.js";
import { generateVaultCsv, generateVaultXlsx } from "../utils/vaultExportUtils.js";
import { decryptVaultPassword, deriveVaultKey, encryptVaultPassword } from "./vaultCipher.js";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

export class VaultService {
  private readonly repo: VaultRepository;
  private readonly hooks: IHookManager;
  private readonly logger: ILogger;
  private readonly encryptionKey: Buffer;

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

  async list(category?: string, search?: string): Promise<VaultItemDoc[]> {
    const items = await this.repo.list(category, search);
    return items.map((item) => ({
      ...item,
      password: "••••••••",
    }));
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
    const items = await this.repo.list();
    this.logger.warn("Vault items exported", { count: items.length, actorId });
    await this.hooks.emit(VAULT_EVENTS.EXPORTED, {
      count: items.length,
      actorId,
      timestamp: new Date(),
    });

    const headers = [
      "Title",
      "Username",
      "Password",
      "URL",
      "Category",
      "Notes",
      "Password Changed At",
      "Created At",
    ];

    const rows = items.map((item) => {
      let decryptedPassword: string;
      try {
        decryptedPassword = decryptVaultPassword(item.password, this.encryptionKey);
      } catch {
        decryptedPassword = "[ENCRYPTED_OR_CORRUPT]";
      }
      return [
        item.title,
        item.username ?? "",
        decryptedPassword,
        item.url ?? "",
        item.category ?? "General",
        item.notes ?? "",
        item.passwordChangedAt?.toISOString() ?? (item.updatedAt || item.createdAt).toISOString(),
        item.createdAt.toISOString(),
      ];
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      return {
        data: generateVaultCsv(headers, rows),
        mimeType: "text/csv; charset=utf-8",
        filename: `vault-export-${dateStr}.csv`,
      };
    }

    return {
      data: generateVaultXlsx(headers, rows, "VaultExport"),
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `vault-export-${dateStr}.xlsx`,
    };
  }

  async importItems(
    rawItems: unknown[],
    actorId?: string,
  ): Promise<{ importedCount: number; errors: Array<{ row: number; error: string }> }> {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return { importedCount: 0, errors: [] };
    }

    const validItems: CreateVaultItemInput[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rawItems.length; i++) {
      const raw = rawItems[i];
      try {
        const validated = validateCreateVaultItem(raw);
        validItems.push({
          ...validated,
          password: encryptVaultPassword(validated.password, this.encryptionKey),
          passwordChangedAt: new Date(),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Validation failed";
        errors.push({ row: i + 1, error: msg });
      }
    }

    let importedCount = 0;
    if (validItems.length > 0) {
      const created = await this.repo.bulkCreate(validItems);
      importedCount = created.length;
      this.logger.info("Vault items imported", { importedCount, actorId });
      await this.hooks.emit(VAULT_EVENTS.IMPORTED, {
        importedCount,
        actorId,
        timestamp: new Date(),
      });
    }

    return { importedCount, errors };
  }

  previewItems(rawItems: unknown[]): {
    totalRows: number;
    validCount: number;
    invalidCount: number;
    rows: Array<{
      title: string;
      username: string;
      category: string;
      url: string;
      notes: string;
      isValid: boolean;
      errorReason?: string;
    }>;
    items: CreateVaultItemInput[];
  } {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return { totalRows: 0, validCount: 0, invalidCount: 0, rows: [], items: [] };
    }

    const previewRows: Array<{
      title: string;
      username: string;
      category: string;
      url: string;
      notes: string;
      isValid: boolean;
      errorReason?: string;
    }> = [];
    const validItems: CreateVaultItemInput[] = [];

    for (let i = 0; i < rawItems.length; i++) {
      const raw = rawItems[i] as Record<string, unknown> | null | undefined;
      const title = String(raw?.["title"] ?? "").trim();
      const username = String(raw?.["username"] ?? "").trim();
      const category = String(raw?.["category"] ?? "General").trim() || "General";
      const url = String(raw?.["url"] ?? "").trim();
      const notes = String(raw?.["notes"] ?? "").trim();

      try {
        const validated = validateCreateVaultItem(raw);
        validItems.push(validated);
        previewRows.push({
          title: validated.title,
          username: validated.username ?? "",
          category: validated.category ?? "General",
          url: validated.url ?? "",
          notes: validated.notes ?? "",
          isValid: true,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Validation failed";
        previewRows.push({
          title,
          username,
          category,
          url,
          notes,
          isValid: false,
          errorReason: msg,
        });
      }
    }

    const validCount = validItems.length;
    const invalidCount = previewRows.length - validCount;

    return {
      totalRows: previewRows.length,
      validCount,
      invalidCount,
      rows: previewRows,
      items: validItems,
    };
  }
}
