import { NotFoundError, type IHookManager, type ILogger } from "@cms/core";
import { randomInt } from "node:crypto";
import {
  VAULT_EVENTS,
  type CreateVaultItemInput,
  type GeneratePasswordInput,
  type UpdateVaultItemInput,
  type VaultItemDoc,
} from "../domain/vault.rules.js";
import type { VaultRepository } from "../repositories/vaultRepository.js";
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
}
