import type { ICache, ICollection, IDatabase } from "@cms/core";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@cms/core";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import type { ApiTokenDoc } from "./repositories/apiTokensRepository.js";
import { ApiTokensRepository } from "./repositories/apiTokensRepository.js";
import { ApiTokenService } from "./services/ApiTokenService.js";
import { deriveTokenKey } from "./services/tokenCipher.js";

function makeStubDb(): IDatabase {
  const store = new Map<string, ApiTokenDoc>();
  const collection: ICollection<ApiTokenDoc> = {
    findOne: async (filter) => {
      if (filter["id"]) return store.get(filter["id"] as string) ?? null;
      if (filter["tokenHash"]) {
        for (const doc of store.values()) {
          if (doc.tokenHash === filter["tokenHash"]) return doc;
        }
      }
      return null;
    },
    find: async (filter) => {
      const all = Array.from(store.values());
      if (filter && filter["userId"]) {
        return all.filter((t) => t.userId === filter["userId"]);
      }
      return all;
    },
    insertOne: async (doc) => {
      store.set(doc["id"] as string, doc as unknown as ApiTokenDoc);
    },
    insertMany: async () => {},
    updateOne: async (filter, update) => {
      const doc = store.get(filter["id"] as string);
      if (doc && update["$set"]) {
        Object.assign(doc, update["$set"]);
      }
    },
    updateMany: async (filter, update) => {
      let modifiedCount = 0;
      for (const doc of store.values()) {
        let match = true;
        if (filter["userId"] && doc.userId !== filter["userId"]) match = false;
        if (filter["revokedAt"] === null && doc.revokedAt != null) match = false;
        if (match) {
          if (update["$set"]) {
            Object.assign(doc, update["$set"]);
          }
          modifiedCount++;
        }
      }
      return { modifiedCount };
    },
    deleteOne: async (filter) => {
      if (filter["id"]) {
        store.delete(filter["id"] as string);
      } else if (filter["userId"]) {
        for (const [k, v] of store.entries()) {
          if (v.userId === filter["userId"]) store.delete(k);
        }
      } else {
        store.clear();
      }
    },
    deleteMany: async (filter) => {
      let deletedCount = 0;
      if (filter["userId"]) {
        for (const [k, v] of store.entries()) {
          if (v.userId === filter["userId"]) {
            store.delete(k);
            deletedCount++;
          }
        }
      } else {
        deletedCount = store.size;
        store.clear();
      }
      return { deletedCount };
    },
    countDocuments: async (filter = {}) => {
      let count = 0;
      for (const doc of store.values()) {
        let match = true;
        if (filter["userId"] && doc.userId !== filter["userId"]) match = false;
        if (filter["scopes"] && !doc.scopes?.includes(filter["scopes"] as string)) match = false;
        if (filter["lastUsedAt"] && !doc.lastUsedAt) match = false;
        if (match) count++;
      }
      return count;
    },
    createIndex: async () => {},
  };

  return {
    connect: async () => {},
    disconnect: async () => {},
    isAlive: async () => true,
    collection: <T extends Record<string, unknown>>(): ICollection<T> =>
      collection as unknown as ICollection<T>,
  };
}

describe("ApiTokenService", () => {
  it("generates a valid API token and stores SHA-256 hash at rest", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const service = new ApiTokenService(repo);

    const { rawToken, token } = await service.createToken("user-1", "Deploy Token");

    assert.ok(rawToken.startsWith("cms_token_"));
    assert.strictEqual(token.userId, "user-1");
    assert.strictEqual(token.name, "Deploy Token");
    assert.deepStrictEqual(token.scopes, ["*"]);
    assert.strictEqual(token.expiresAt, null);
    assert.strictEqual(token.lastUsedAt, null);

    // Verify token prefix
    const expectedPrefix = `cms_token_...${rawToken.slice(-4)}`;
    assert.strictEqual(token.tokenPrefix, expectedPrefix);

    // Verify SHA-256 hash at rest
    const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    assert.strictEqual(token.tokenHash, expectedHash);

    // Verify rawToken is not stored
    const stored = await repo.findById(token.id);
    assert.ok(stored);
    assert.strictEqual(stored.tokenHash, expectedHash);
    assert.strictEqual((stored as Record<string, unknown>)["rawToken"], undefined);
  });

  it("sets expiration date when expiresInDays is provided", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const service = new ApiTokenService(repo);

    const { token } = await service.createToken("user-1", "Temp Token", ["read"], 30);
    assert.ok(token.expiresAt);
    assert.ok(token.expiresAt.getTime() > Date.now());
    assert.deepStrictEqual(token.scopes, ["read"]);
  });

  it("validates a legitimate token and asynchronously updates lastUsedAt", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const service = new ApiTokenService(repo);

    const { rawToken, token } = await service.createToken("user-1", "CI Token", ["content:read"]);
    const validated = await service.validateToken(rawToken);

    assert.strictEqual(validated.tokenId, token.id);
    assert.strictEqual(validated.userId, "user-1");
    assert.deepStrictEqual(validated.scopes, ["content:read"]);

    // Allow async tick for updateLastUsedAt
    await new Promise((resolve) => setTimeout(resolve, 10));
    const updated = await repo.findById(token.id);
    assert.ok(updated?.lastUsedAt);
  });

  it("rejects non-existent or invalid tokens with UnauthorizedError", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const service = new ApiTokenService(repo);

    await assert.rejects(
      async () => service.validateToken("cms_token_nonexistent_token_string"),
      UnauthorizedError,
    );
  });

  it("rejects expired tokens with UnauthorizedError", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const service = new ApiTokenService(repo);

    const { rawToken, token } = await service.createToken("user-1", "Expired Token");
    // Manually set expiration in the past
    await repo.updateLastUsedAt(token.id, new Date());
    const pastDate = new Date(Date.now() - 1000 * 60 * 60);
    await db
      .collection("cms_api_tokens")
      .updateOne({ id: token.id }, { $set: { expiresAt: pastDate } });

    await assert.rejects(async () => service.validateToken(rawToken), UnauthorizedError);
  });

  it("rejects revoked tokens with UnauthorizedError", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const service = new ApiTokenService(repo);

    const { rawToken, token } = await service.createToken("user-1", "Revoked Token");
    await db
      .collection("cms_api_tokens")
      .updateOne(
        { id: token.id },
        { $set: { revokedAt: new Date(), revokeReason: "user_deleted" } },
      );

    await assert.rejects(async () => service.validateToken(rawToken), UnauthorizedError);
  });

  it("revokes all tokens for a user via revokeByUserId and rejects validation", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const service = new ApiTokenService(repo);

    const { rawToken: token1 } = await service.createToken("user-to-delete", "Token 1");
    const { rawToken: token2 } = await service.createToken("user-to-delete", "Token 2");
    const { rawToken: otherToken } = await service.createToken("user-kept", "Token Other");

    await repo.revokeByUserId("user-to-delete", "user_deleted");

    await assert.rejects(async () => service.validateToken(token1), UnauthorizedError);
    await assert.rejects(async () => service.validateToken(token2), UnauthorizedError);
    await assert.doesNotReject(async () => service.validateToken(otherToken));
  });

  it("deletes all tokens for a user via deleteByUserId", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const service = new ApiTokenService(repo);

    await service.createToken("user-cleanup", "Token 1");
    await service.createToken("user-cleanup", "Token 2");
    await service.createToken("user-preserved", "Token 3");

    await repo.deleteByUserId("user-cleanup");

    const remaining = await repo.findByUserId("user-cleanup");
    assert.strictEqual(remaining.length, 0);
    const preserved = await repo.findByUserId("user-preserved");
    assert.strictEqual(preserved.length, 1);
  });

  it("lists user tokens without exposing tokenHash", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const service = new ApiTokenService(repo);

    await service.createToken("user-1", "Token 1");
    await service.createToken("user-1", "Token 2");
    await service.createToken("user-2", "Other User Token");

    const user1Tokens = await service.listUserTokens("user-1");
    assert.strictEqual(user1Tokens.length, 2);
    for (const tok of user1Tokens) {
      assert.strictEqual(tok.userId, "user-1");
      assert.strictEqual((tok as unknown as Record<string, unknown>)["tokenHash"], undefined);
    }
  });

  it("enforces IDOR checks on token revocation", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const service = new ApiTokenService(repo);

    const { token } = await service.createToken("user-owner", "My Token");

    // Foreign user without permissions cannot revoke
    await assert.rejects(
      async () => service.revokeToken(token.id, { id: "foreign-user", permissions: [] }),
      ForbiddenError,
    );

    // Foreign user with wildcard permission can revoke
    await assert.doesNotReject(async () =>
      service.revokeToken(token.id, { id: "admin-user", permissions: ["*"] }),
    );

    // Token should now be soft-revoked
    const revoked1 = await repo.findById(token.id);
    assert.ok(revoked1?.revokedAt);
    assert.strictEqual(revoked1?.revokeReason, "user_revoked");

    // Revoking non-existent token throws NotFoundError
    await assert.rejects(
      async () => service.revokeToken("non-existent-id", { id: "user-owner", permissions: [] }),
      NotFoundError,
    );

    // User with users:write permission can revoke
    const { token: token2 } = await service.createToken("user-owner-2", "My Token 2");
    await assert.doesNotReject(async () =>
      service.revokeToken(token2.id, { id: "manager-user", permissions: ["users:write"] }),
    );
    const revoked2 = await repo.findById(token2.id);
    assert.ok(revoked2?.revokedAt);

    // Owner can revoke their own token
    const { token: token3 } = await service.createToken("user-owner-3", "My Token 3");
    await assert.doesNotReject(async () =>
      service.revokeToken(token3.id, { id: "user-owner-3", permissions: [] }),
    );
    const revoked3 = await repo.findById(token3.id);
    assert.ok(revoked3?.revokedAt);

    // API token session cannot revoke tokens even if user.id matches
    const { token: token4 } = await service.createToken("user-owner-4", "My Token 4");
    await assert.rejects(
      async () =>
        service.revokeToken(token4.id, {
          id: "user-owner-4",
          permissions: ["*"],
          sessionId: "api-token:tok-sub-agent",
        }),
      ForbiddenError,
    );
  });

  it("encrypts token at rest with AES-256-GCM and allows authorized reveal", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const key = deriveTokenKey("super-secret-jwt-key-minimum-32-chars-long");
    const service = new ApiTokenService(repo, key);

    const { rawToken, token } = await service.createToken("user-owner", "Secret Agent Token");

    // Stored document contains encryptedToken header
    const stored = await repo.findById(token.id);
    assert.ok(stored?.encryptedToken);
    assert.ok(stored.encryptedToken.startsWith("enc:tok:v1:"));

    // Owner can reveal and retrieve exact rawToken
    const revealed = await service.revealToken(token.id, { id: "user-owner", permissions: [] });
    assert.strictEqual(revealed, rawToken);

    // Admin with wildcard permission can reveal
    const adminRevealed = await service.revealToken(token.id, {
      id: "admin-user",
      permissions: ["*"],
    });
    assert.strictEqual(adminRevealed, rawToken);

    // User with users:write permission can reveal
    const managerRevealed = await service.revealToken(token.id, {
      id: "manager-user",
      permissions: ["users:write"],
    });
    assert.strictEqual(managerRevealed, rawToken);
  });

  it("enforces IDOR and permission checks on revealToken", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const key = deriveTokenKey("super-secret-jwt-key-minimum-32-chars-long");
    const service = new ApiTokenService(repo, key);

    const { token } = await service.createToken("user-owner", "Protected Token");

    // Foreign user without permissions is rejected
    await assert.rejects(
      async () => service.revealToken(token.id, { id: "foreign-user", permissions: [] }),
      ForbiddenError,
    );

    // Foreign user with unrelated permission is rejected
    await assert.rejects(
      async () =>
        service.revealToken(token.id, { id: "foreign-user", permissions: ["content:read"] }),
      ForbiddenError,
    );

    // API token session cannot reveal tokens even for the owner
    await assert.rejects(
      async () =>
        service.revealToken(token.id, {
          id: "user-owner",
          permissions: ["*"],
          sessionId: "api-token:tok-runner",
        }),
      ForbiddenError,
    );

    // Revealing non-existent token throws NotFoundError
    await assert.rejects(
      async () => service.revealToken("non-existent-id", { id: "user-owner", permissions: [] }),
      NotFoundError,
    );
  });

  it("throws error when attempting to reveal a legacy token without encrypted payload", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const key = deriveTokenKey("super-secret-jwt-key-minimum-32-chars-long");
    const unencryptedService = new ApiTokenService(repo);

    // Created without encryption key
    const { token } = await unencryptedService.createToken("user-owner", "Legacy Token");

    const encryptedService = new ApiTokenService(repo, key);
    await assert.rejects(
      async () => encryptedService.revealToken(token.id, { id: "user-owner", permissions: [] }),
      {
        message: "This token cannot be revealed because it was stored with legacy one-way hashing.",
      },
    );
  });

  it("supports configurable project prefix (e.g. acme_tok_) and isApiToken detection", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);
    const customService = new ApiTokenService(repo, undefined, "acme_tok_");

    assert.strictEqual(customService.getPrefix(), "acme_tok_");

    const { rawToken, token } = await customService.createToken("user-1", "Acme Agent");
    assert.ok(rawToken.startsWith("acme_tok_"));
    assert.ok(token.tokenPrefix.startsWith("acme_tok_..."));

    // isApiToken checks both active prefix and legacy cms_tok_
    assert.strictEqual(customService.isApiToken(rawToken), true);
    assert.strictEqual(customService.isApiToken("cms_tok_legacy_token_123"), true);
    assert.strictEqual(customService.isApiToken("random_jwt_or_other_token"), false);

    // Validates custom prefix token properly
    const validated = await customService.validateToken(rawToken);
    assert.strictEqual(validated.tokenId, token.id);

    // Prefix without trailing underscore is automatically normalized
    const unnormalizedService = new ApiTokenService(repo, undefined, "myshop");
    assert.strictEqual(unnormalizedService.getPrefix(), "myshop_");
  });

  it("supports status filtering (active, revoked, expired) and returns revokedAt in paginated list", async () => {
    const { InMemoryDatabase } = await import("@cms/db");
    const db = new InMemoryDatabase();
    const repo = new ApiTokensRepository(db);
    const service = new ApiTokenService(repo);

    // 1. Active token
    await service.createToken("user-filter", "Active Key", ["*"]);
    // 2. Revoked token
    const { token: revokedToken } = await service.createToken("user-filter", "Revoked Key", [
      "pages:read",
    ]);
    await repo.revokeById(revokedToken.id, "Security cycle");
    // 3. Expired token
    const pastDate = new Date(Date.now() - 3600 * 1000);
    await repo.create({
      userId: "user-filter",
      name: "Expired Key",
      tokenHash: "hash-expired",
      tokenPrefix: "cms_token_...exp1",
      scopes: ["blog:read"],
      expiresAt: pastDate,
    });

    // Test active filter
    const activeResult = await service.listUserTokensPaginated("user-filter", 1, 10, {
      status: "active",
    });
    assert.strictEqual(activeResult.data.length, 1);
    assert.strictEqual(activeResult.data[0]?.name, "Active Key");
    assert.strictEqual(activeResult.data[0]?.revokedAt, null);

    // Test revoked filter
    const revokedResult = await service.listUserTokensPaginated("user-filter", 1, 10, {
      status: "revoked",
    });
    assert.strictEqual(revokedResult.data.length, 1);
    assert.strictEqual(revokedResult.data[0]?.name, "Revoked Key");
    assert.ok(revokedResult.data[0]?.revokedAt);
    assert.strictEqual(revokedResult.data[0]?.revokeReason, "Security cycle");

    // Test expired filter
    const expiredResult = await service.listUserTokensPaginated("user-filter", 1, 10, {
      status: "expired",
    });
    assert.strictEqual(expiredResult.data.length, 1);
    assert.strictEqual(expiredResult.data[0]?.name, "Expired Key");

    // Test all
    const allResult = await service.listUserTokensPaginated("user-filter", 1, 10, {
      status: "all",
    });
    assert.strictEqual(allResult.data.length, 3);
  });

  it("caches validated tokens in distributed cache and invalidates on revokeToken", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);

    const store = new Map<string, unknown>();
    const deletedKeys: string[] = [];
    const cache: ICache = {
      get: async (key: string) => (store.has(key) ? String(store.get(key)) : null),
      set: async (key: string, value: string) => {
        store.set(key, value);
      },
      del: async (...keys: string[]) => {
        deletedKeys.push(...keys);
        for (const k of keys) store.delete(k);
      },
      isAlive: async () => true,
      quit: async () => {},
      getJson: async <T>(key: string) => (store.has(key) ? (store.get(key) as T) : null),
      setJson: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      getOrSet: async <T>(key: string, factory: () => Promise<T>) => {
        if (store.has(key)) return store.get(key) as T;
        const fresh = await factory();
        if (fresh !== undefined) store.set(key, fresh);
        return fresh;
      },
    };

    const service = new ApiTokenService(repo, undefined, "cms_token_", cache);

    const { rawToken, token } = await service.createToken("user-caching", "Cache Test Key", ["*"]);
    const expectedCacheKey = `cms:auth:token:${token.tokenHash}`;

    // 1. Initial validation runs factory and populates cache
    const validated1 = await service.validateToken(rawToken);
    assert.strictEqual(validated1.tokenId, token.id);
    assert.ok(store.has(expectedCacheKey));

    // 2. Second validation serves from cache
    const validated2 = await service.validateToken(rawToken);
    assert.strictEqual(validated2.tokenId, token.id);

    // 3. Revoke token explicitly invalidates cache key
    await service.revokeToken(token.id, { id: "user-caching", permissions: [] });
    assert.ok(deletedKeys.includes(expectedCacheKey));
    assert.strictEqual(store.has(expectedCacheKey), false);

    // 4. Subsequent validation throws UnauthorizedError
    await assert.rejects(async () => service.validateToken(rawToken), UnauthorizedError);
  });

  it("adversarial audit: revokeToken fails closed immediately, rejects unauthorized callers, and forbids recursion", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);

    const store = new Map<string, unknown>();
    const deletedKeys: string[] = [];
    const cache: ICache = {
      get: async (key: string) => (store.has(key) ? String(store.get(key)) : null),
      set: async (key: string, value: string) => {
        store.set(key, value);
      },
      del: async (...keys: string[]) => {
        deletedKeys.push(...keys);
        for (const k of keys) store.delete(k);
      },
      isAlive: async () => true,
      quit: async () => {},
      getJson: async <T>(key: string) => (store.has(key) ? (store.get(key) as T) : null),
      setJson: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      getOrSet: async <T>(key: string, factory: () => Promise<T>) => {
        if (store.has(key)) return store.get(key) as T;
        const fresh = await factory();
        if (fresh !== undefined && fresh !== null) store.set(key, fresh);
        return fresh;
      },
    };

    const service = new ApiTokenService(repo, undefined, "cms_token_", cache);

    // 1. Create a valid token for user-victim
    const { rawToken, token } = await service.createToken("user-victim", "Victim Token", ["*"]);
    const cacheKey = `cms:auth:token:${token.tokenHash}`;

    // Validate once to populate Redis cache
    const initialValidation = await service.validateToken(rawToken);
    assert.strictEqual(initialValidation.tokenId, token.id);
    assert.ok(store.has(cacheKey), "Token must be cached in Redis");

    // 2. Attacker user-evil (without permissions) attempts to revoke user-victim's token
    await assert.rejects(
      async () => service.revokeToken(token.id, { id: "user-evil", permissions: [] }),
      ForbiddenError,
      "Unauthorized caller must be blocked from revoking another user's token",
    );
    // Cache must NOT be cleared by unauthorized attempt
    assert.ok(store.has(cacheKey), "Cache must NOT be evicted by unauthorized revocation attempt");

    // 3. API token session attempting to revoke must be blocked (recursion prevention)
    await assert.rejects(
      async () =>
        service.revokeToken(token.id, {
          id: "user-victim",
          permissions: ["*"],
          sessionId: `api-token:${token.id}`,
        }),
      ForbiddenError,
      "API token session must not be allowed to revoke tokens",
    );

    // 4. Legitimate owner revokes token
    await service.revokeToken(token.id, { id: "user-victim", permissions: [] });

    // Cache key must be evicted immediately
    assert.strictEqual(
      store.has(cacheKey),
      false,
      "Cache key must be immediately evicted upon revocation",
    );

    // 5. Subsequent validation must fail closed immediately (OWASP A07 - 401 Unauthorized)
    await assert.rejects(
      async () => service.validateToken(rawToken),
      (err: unknown) => err instanceof UnauthorizedError && err.statusCode === 401,
      "Revoked token must immediately fail closed with 401 Unauthorized",
    );

    // Verify cache remains unpolluted (does not store failed token)
    assert.strictEqual(
      store.has(cacheKey),
      false,
      "Cache must not be repopulated after fail-closed validation rejection",
    );
  });

  it("ApiTokensRepository.getStats safely handles empty DB and returns accurate stats without null/undefined crashes", async () => {
    const db = makeStubDb();
    const repo = new ApiTokensRepository(db);

    // 1. Empty database must safely return zeros
    const emptyStats = await repo.getStats();
    assert.strictEqual(emptyStats.total, 0);
    assert.strictEqual(emptyStats.activeCount, 0);
    assert.strictEqual(emptyStats.fullAccessCount, 0);

    // 2. Add tokens with various states
    await repo.create({
      userId: "user-stats-1",
      name: "Token 1",
      tokenHash: "hash1",
      tokenPrefix: "cms_token_...1111",
      scopes: ["*"], // full access
      expiresAt: null,
    });
    await repo.create({
      userId: "user-stats-1",
      name: "Token 2",
      tokenHash: "hash2",
      tokenPrefix: "cms_token_...2222",
      scopes: ["read:pages"], // scoped
      expiresAt: new Date(Date.now() + 86400000),
    });

    const populatedStats = await repo.getStats("user-stats-1");
    assert.strictEqual(populatedStats.total, 2);
    assert.strictEqual(populatedStats.fullAccessCount, 1);
  });
});
