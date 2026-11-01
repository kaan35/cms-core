import type { IHookManager, ILogger } from "@cms/core";
import {
  VAULT_EVENTS,
  validateCreateVaultItem,
  type CreateVaultItemInput,
} from "../domain/vault.rules.js";
import type { VaultRepository } from "../repositories/vaultRepository.js";
import { generateVaultCsv, generateVaultXlsx } from "../utils/vaultExportUtils.js";
import { decryptVaultPassword, encryptVaultPassword } from "./vaultCipher.js";

export class VaultTransferService {
  private readonly repo: VaultRepository;
  private readonly hooks: IHookManager;
  private readonly logger: ILogger;
  private readonly encryptionKey: Buffer;

  constructor(repo: VaultRepository, hooks: IHookManager, logger: ILogger, encryptionKey: Buffer) {
    this.repo = repo;
    this.hooks = hooks;
    this.logger = logger;
    this.encryptionKey = encryptionKey;
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
