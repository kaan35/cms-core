import type { ICache } from "@cms/core";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  buildPaginatedResult,
} from "@cms/core";
import crypto from "node:crypto";
import type {
  ApiTokenDoc,
  ApiTokenFilter,
  ApiTokensRepository,
} from "../repositories/apiTokensRepository.js";
import { decryptTokenString, encryptTokenString } from "./tokenCipher.js";

const MS_PER_DAY = 86_400_000;

export interface ApiTokenInfo {
  id: string;
  userId: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export interface AuthenticatedUserContext {
  id: string;
  permissions: string[];
  sessionId?: string | undefined;
}

export class ApiTokenService {
  private readonly tokensRepo: ApiTokensRepository;
  private readonly encryptionKey?: Buffer | undefined;
  private readonly prefix: string;
  private readonly cache?: ICache | undefined;

  constructor(
    tokensRepo: ApiTokensRepository,
    encryptionKey?: Buffer,
    prefix = "cms_token_",
    cache?: ICache,
  ) {
    this.tokensRepo = tokensRepo;
    this.encryptionKey = encryptionKey;
    const cleanPrefix = prefix.trim();
    this.prefix =
      cleanPrefix.endsWith("_") || cleanPrefix.endsWith("-") ? cleanPrefix : `${cleanPrefix}_`;
    this.cache = cache;
  }

  getPrefix(): string {
    return this.prefix;
  }

  isApiToken(token: string): boolean {
    return (
      token.startsWith(this.prefix) ||
      token.startsWith("cms_token_") ||
      token.startsWith("cms_tok_")
    );
  }

  async createToken(
    userId: string,
    name: string,
    scopes: string[] = ["*"],
    expiresInDays?: number,
  ): Promise<{ rawToken: string; token: ApiTokenDoc }> {
    const randomHex = crypto.randomBytes(32).toString("hex");
    const rawToken = `${this.prefix}${randomHex}`;
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenPrefix = `${this.prefix}...${rawToken.slice(-4)}`;
    const expiresAt =
      expiresInDays && expiresInDays > 0 ? new Date(Date.now() + expiresInDays * MS_PER_DAY) : null;

    const encryptedToken = this.encryptionKey
      ? encryptTokenString(rawToken, this.encryptionKey)
      : undefined;

    const token = await this.tokensRepo.create({
      id: crypto.randomUUID(),
      userId,
      name,
      tokenHash,
      tokenPrefix,
      scopes,
      expiresAt,
      encryptedToken,
    });

    return { rawToken, token };
  }

  async listUserTokens(userId: string): Promise<ApiTokenInfo[]> {
    const tokens = await this.tokensRepo.findByUserId(userId);
    return tokens.map((t) => ({
      id: t.id,
      userId: t.userId,
      name: t.name,
      tokenPrefix: t.tokenPrefix,
      scopes: t.scopes,
      expiresAt: t.expiresAt,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
    }));
  }

  async listUserTokensPaginated(userId: string, page = 1, limit = 20, filter?: ApiTokenFilter) {
    const targetUserId = filter?.userId || userId;
    const [{ items, total }, stats] = await Promise.all([
      this.tokensRepo.findPaginatedByUserId(targetUserId, page, limit, filter),
      this.tokensRepo.getStats(targetUserId),
    ]);
    const masked = items.map((t) => ({
      id: t.id,
      name: t.name,
      tokenPrefix: t.tokenPrefix,
      scopes: t.scopes,
      expiresAt: t.expiresAt,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
      revokedAt: t.revokedAt,
      revokeReason: t.revokeReason,
    }));
    return buildPaginatedResult(masked, total, page, limit, stats);
  }

  async revokeToken(id: string, user: AuthenticatedUserContext): Promise<void> {
    if (user.sessionId?.startsWith("api-token:")) {
      throw new ForbiddenError("API tokens cannot be used to revoke other tokens");
    }

    const token = await this.tokensRepo.findById(id);
    if (!token) {
      throw new NotFoundError("API token not found");
    }

    const hasPermission =
      token.userId === user.id ||
      user.permissions.includes("*") ||
      user.permissions.includes("users:write");

    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to revoke this token");
    }

    await this.tokensRepo.revokeById(id, "user_revoked");
    if (this.cache && token.tokenHash) {
      await this.cache.del(`cms:auth:token:${token.tokenHash}`);
    }
  }

  async revealToken(id: string, user: AuthenticatedUserContext): Promise<string> {
    if (user.sessionId?.startsWith("api-token:")) {
      throw new ForbiddenError("API tokens cannot be used to reveal other tokens");
    }

    const token = await this.tokensRepo.findById(id);
    if (!token) {
      throw new NotFoundError("API token not found");
    }

    const hasPermission =
      token.userId === user.id ||
      user.permissions.includes("*") ||
      user.permissions.includes("users:write");
    if (!hasPermission) {
      throw new ForbiddenError("You do not have permission to view this token");
    }

    if (!token.encryptedToken || !this.encryptionKey) {
      throw new ValidationError(
        "This token cannot be revealed because it was stored with legacy one-way hashing.",
      );
    }

    return decryptTokenString(token.encryptedToken, this.encryptionKey);
  }

  async validateToken(rawToken: string): Promise<{
    tokenId: string;
    tokenName?: string;
    tokenPrefix?: string;
    userId: string;
    scopes: string[];
  }> {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const cacheKey = `cms:auth:token:${tokenHash}`;

    type ValidatedToken = {
      tokenId: string;
      tokenName?: string;
      tokenPrefix?: string;
      userId: string;
      scopes: string[];
    };

    if (this.cache) {
      const cached = await this.cache.getJson<ValidatedToken>(cacheKey);
      if (cached) {
        this.tokensRepo.updateLastUsedAt(cached.tokenId, new Date()).catch(() => {});
        return cached;
      }
    }

    const token = await this.tokensRepo.findByHash(tokenHash);

    if (!token || token.revokedAt || (token.expiresAt && token.expiresAt.getTime() <= Date.now())) {
      throw new UnauthorizedError("Invalid or expired API token");
    }

    const tokenData: ValidatedToken = {
      tokenId: token.id,
      tokenName: token.name,
      tokenPrefix: token.tokenPrefix,
      userId: token.userId,
      scopes: token.scopes,
    };

    if (this.cache) {
      const defaultTtl = 300;
      let ttl = defaultTtl;
      if (token.expiresAt) {
        const remainingSeconds = Math.max(
          1,
          Math.floor((token.expiresAt.getTime() - Date.now()) / 1000),
        );
        ttl = Math.min(defaultTtl, remainingSeconds);
      }
      await this.cache.setJson(cacheKey, tokenData, ttl);
    }

    this.tokensRepo.updateLastUsedAt(tokenData.tokenId, new Date()).catch(() => {});

    return tokenData;
  }
}
