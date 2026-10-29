import type { ICollection, IDatabase } from "@cms/core";
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
    countDocuments: async () => store.size,
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

    // Token should now be deleted
    assert.strictEqual(await repo.findById(token.id), null);

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
    assert.strictEqual(await repo.findById(token2.id), null);

    // Owner can revoke their own token
    const { token: token3 } = await service.createToken("user-owner-3", "My Token 3");
    await assert.doesNotReject(async () =>
      service.revokeToken(token3.id, { id: "user-owner-3", permissions: [] }),
    );
    assert.strictEqual(await repo.findById(token3.id), null);

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
});
