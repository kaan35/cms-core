import type { ICollection, IDatabase, ILogger } from "@cms/core";
import { ForbiddenError, HookManager, PERMISSIONS, UnauthorizedError } from "@cms/core";
import jwt from "jsonwebtoken";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasPermission } from "../domain/permission.rules.js";
import { RolesRepository } from "../repositories/rolesRepository.js";
import { SessionsRepository } from "../repositories/sessionsRepository.js";
import { UsersRepository } from "../repositories/usersRepository.js";
import { SessionService } from "../sessionService.js";
import { UserService } from "./UserService.js";

const stubLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

function createAuditTestDb(): IDatabase {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();

  function getColStore(name: string) {
    if (!collections.has(name)) {
      collections.set(name, new Map());
    }
    return collections.get(name)!;
  }

  return {
    connect: async () => {},
    disconnect: async () => {},
    isAlive: async () => true,
    collection: <T extends Record<string, unknown>>(name: string): ICollection<T> => {
      const store = getColStore(name);

      return {
        findOne: async (filter: Record<string, unknown>) => {
          for (const doc of store.values()) {
            let match = true;
            for (const [k, v] of Object.entries(filter)) {
              if (doc[k] !== v) {
                match = false;
                break;
              }
            }
            if (match) return { ...doc } as unknown as T;
          }
          return null;
        },
        find: async (filter: Record<string, unknown> = {}, options = {}) => {
          let docs = Array.from(store.values());
          if (Object.keys(filter).length > 0) {
            docs = docs.filter((doc) => {
              if (Array.isArray(filter["$or"])) {
                return (filter["$or"] as Record<string, unknown>[]).some((subFilter) => {
                  return Object.entries(subFilter).every(([k, v]) => {
                    if (typeof v === "object" && v !== null && "$in" in v) {
                      const ids = (v as { $in: string[] })["$in"];
                      return ids.includes(doc[k] as string);
                    }
                    return doc[k] === v;
                  });
                });
              }
              for (const [k, v] of Object.entries(filter)) {
                if (typeof v === "object" && v !== null && "$in" in v) {
                  const ids = (v as { $in: string[] })["$in"];
                  if (!ids.includes(doc[k] as string)) return false;
                } else if (doc[k] !== v) {
                  return false;
                }
              }
              return true;
            });
          }
          if (options.sort) {
            const sortKey = Object.keys(options.sort)[0];
            const sortDir = sortKey ? (options.sort[sortKey] as number) : 1;
            if (sortKey) {
              docs.sort((a, b) => {
                const av = a[sortKey];
                const bv = b[sortKey];
                if (av === bv) return 0;
                return (av! > bv! ? 1 : -1) * sortDir;
              });
            }
          }
          if (options.skip) docs = docs.slice(options.skip);
          if (options.limit) docs = docs.slice(0, options.limit);
          return docs.map((d) => ({ ...d })) as unknown as T[];
        },
        insertOne: async (doc: Record<string, unknown>) => {
          const id = (doc["id"] as string) || (doc["key"] as string) || String(store.size + 1);
          store.set(id, { ...doc, id });
        },
        updateOne: async (
          filter: Record<string, unknown>,
          update: Record<string, unknown>,
          options = {},
        ) => {
          let targetId: string | null = null;
          for (const [id, doc] of store.entries()) {
            let match = true;
            for (const [k, v] of Object.entries(filter)) {
              if (doc[k] !== v) {
                match = false;
                break;
              }
            }
            if (match) {
              targetId = id;
            }
          }

          if (!targetId && options.upsert) {
            targetId =
              (filter["id"] as string) || (filter["key"] as string) || String(store.size + 1);
            store.set(targetId, { ...filter, id: targetId });
          }

          if (targetId) {
            const existing = store.get(targetId)!;
            if (update["$set"]) {
              Object.assign(existing, update["$set"]);
            } else {
              Object.assign(existing, update);
            }
          }
        },
        deleteOne: async (filter: Record<string, unknown>) => {
          if (Object.keys(filter).length === 0) {
            store.clear();
            return;
          }
          for (const [id, doc] of store.entries()) {
            let match = true;
            for (const [k, v] of Object.entries(filter)) {
              if (doc[k] !== v) {
                match = false;
                break;
              }
            }
            if (match) {
              store.delete(id);
              return;
            }
          }
        },
        countDocuments: async () => store.size,
        createIndex: async () => {},
      };
    },
  };
}

describe("Comprehensive Session Lifecycle & Security QA Audit", () => {
  const jwtSecret = "super-secret-jwt-audit-key-32-chars-minimum!";

  // 1. Multi-Session & Multi-Device Concurrency & Isolation
  describe("Objective 1: Multi-Session & Multi-Device Concurrency & Isolation", () => {
    it("creates 3 distinct concurrent sessions across different devices for the same user", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      const deviceA = await service.createSession("user-100", ["pages:read"], {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
        ip: "192.168.1.10",
      });
      const deviceB = await service.createSession("user-100", ["pages:read"], {
        userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0",
        ip: "10.0.0.25",
      });
      const deviceC = await service.createSession("user-100", ["pages:read"], {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Safari/605.1.15",
        ip: "172.16.50.4",
      });

      assert.notEqual(deviceA.sessionId, deviceB.sessionId);
      assert.notEqual(deviceB.sessionId, deviceC.sessionId);
      assert.notEqual(deviceA.sessionId, deviceC.sessionId);

      const activeSessions = await service.listUserSessions("user-100");
      assert.equal(activeSessions.length, 3);
      for (const s of activeSessions) {
        assert.equal(s.status, "active");
        assert.equal(s.refreshCount, 0);
      }
    });

    it("sliding Device A does NOT alter lastActiveAt or refreshCount of Device B or C", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger, 24, 15);

      const deviceA = await service.createSession("user-100", ["pages:read"]);
      const deviceB = await service.createSession("user-100", ["pages:read"]);
      const deviceC = await service.createSession("user-100", ["pages:read"]);

      const initialB = await sessionsRepo.findById(deviceB.sessionId);
      const initialC = await sessionsRepo.findById(deviceC.sessionId);
      assert.ok(initialB);
      assert.ok(initialC);

      // Artificially advance Device A near expiry (< 15 min slide threshold) to trigger sliding
      const nearExpiryA = new Date(Date.now() + 5 * 60 * 1000);
      await sessionsRepo.updateExpiresAt(deviceA.sessionId, nearExpiryA);

      // Slide Device A
      await service.validateAndSlideSession(deviceA.token);

      const slidA = await sessionsRepo.findById(deviceA.sessionId);
      const afterB = await sessionsRepo.findById(deviceB.sessionId);
      const afterC = await sessionsRepo.findById(deviceC.sessionId);

      assert.ok(slidA);
      assert.ok(afterB);
      assert.ok(afterC);

      // Device A was slid
      assert.equal(slidA.refreshCount, 1);
      assert.ok(slidA.expiresAt.getTime() > nearExpiryA.getTime() + 20 * 3600 * 1000);

      // Device B and C remain completely untouched
      assert.equal(afterB.refreshCount, 0);
      assert.equal(afterB.lastActiveAt.getTime(), initialB.lastActiveAt.getTime());
      assert.equal(afterB.expiresAt.getTime(), initialB.expiresAt.getTime());

      assert.equal(afterC.refreshCount, 0);
      assert.equal(afterC.lastActiveAt.getTime(), initialC.lastActiveAt.getTime());
      assert.equal(afterC.expiresAt.getTime(), initialC.expiresAt.getTime());
    });

    it("revoking Device A leaves Device B and Device C fully active and valid", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      const deviceA = await service.createSession("user-100", ["pages:read"]);
      const deviceB = await service.createSession("user-100", ["pages:read"]);
      const deviceC = await service.createSession("user-100", ["pages:read"]);

      // Revoke Device A only
      await service.revokeSession(deviceA.sessionId, "user-100", "self_revoked");

      // Device A is rejected fail-closed
      await assert.rejects(
        () => service.validateAndSlideSession(deviceA.token),
        (err: Error) => err instanceof UnauthorizedError,
      );

      // Device B and C validate cleanly
      const validB = await service.validateAndSlideSession(deviceB.token);
      assert.equal(validB.id, "user-100");
      assert.equal(validB.sessionId, deviceB.sessionId);

      const validC = await service.validateAndSlideSession(deviceC.token);
      assert.equal(validC.id, "user-100");
      assert.equal(validC.sessionId, deviceC.sessionId);
    });

    it("evaluates isCurrent to true ONLY for the caller's session and false for others", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      const deviceA = await service.createSession("user-100", ["pages:read"]);
      const deviceB = await service.createSession("user-100", ["pages:read"]);
      const deviceC = await service.createSession("user-100", ["pages:read"]);

      // Caller is Device B
      const listFromB = await service.listUserSessions("user-100", deviceB.sessionId);
      assert.equal(listFromB.length, 3);

      const itemA = listFromB.find((s) => s.id === deviceA.sessionId);
      const itemB = listFromB.find((s) => s.id === deviceB.sessionId);
      const itemC = listFromB.find((s) => s.id === deviceC.sessionId);

      assert.equal(itemB?.current, true);
      assert.equal(itemA?.current, false);
      assert.equal(itemC?.current, false);
    });
  });

  // 2. Session Resurrect Immunity (Fail-Closed Lifecycle)
  describe("Objective 2: Session Resurrect Immunity (Fail-Closed Lifecycle)", () => {
    it("suspending a user revokes all active sessions; reactivating NEVER resurrects old revoked sessions", async () => {
      const db = createAuditTestDb();
      const usersRepo = new UsersRepository(db);
      const rolesRepo = new RolesRepository(db);
      const sessionsRepo = new SessionsRepository(db);
      const hooks = new HookManager();
      const userService = new UserService(usersRepo, rolesRepo, sessionsRepo, hooks, stubLogger);
      const sessionService = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      // Create user
      const user = await usersRepo.create({
        email: "target@example.com",
        passwordHash: "$2b$10$dummyHashValueForTestingPasswordStrengths123",
        roleIds: [],
        name: "Target User",
        status: "active",
      });

      // User establishes 2 active sessions
      const s1 = await sessionService.createSession(user.id, ["pages:read"]);
      const s2 = await sessionService.createSession(user.id, ["pages:read"]);

      // Both tokens validate successfully
      assert.equal((await sessionService.validateAndSlideSession(s1.token)).id, user.id);
      assert.equal((await sessionService.validateAndSlideSession(s2.token)).id, user.id);

      // Admin suspends user
      await userService.updateUser(user.id, { status: "suspended" }, "admin-999");

      // Verify sessions are marked revoked with user_suspended in DB
      const session1Doc = await sessionsRepo.findById(s1.sessionId);
      const session2Doc = await sessionsRepo.findById(s2.sessionId);
      assert.equal(session1Doc?.status, "revoked");
      assert.equal(session1Doc?.revokeReason, "user_suspended");
      assert.equal(session1Doc?.revokedBy, "admin-999");
      assert.equal(session2Doc?.status, "revoked");
      assert.equal(session2Doc?.revokeReason, "user_suspended");

      // Attempts to use tokens fail immediately
      await assert.rejects(
        () => sessionService.validateAndSlideSession(s1.token),
        (err: Error) => err instanceof UnauthorizedError,
      );
      await assert.rejects(
        () => sessionService.validateAndSlideSession(s2.token),
        (err: Error) => err instanceof UnauthorizedError,
      );

      // Admin reactivates the user
      await userService.updateUser(user.id, { status: "active" }, "admin-999");

      // RESURRECT IMMUNITY ASSERTION: Old sessions must REMAIN revoked
      const session1After = await sessionsRepo.findById(s1.sessionId);
      const session2After = await sessionsRepo.findById(s2.sessionId);
      assert.equal(session1After?.status, "revoked");
      assert.equal(session1After?.revokeReason, "user_suspended");
      assert.equal(session2After?.status, "revoked");
      assert.equal(session2After?.revokeReason, "user_suspended");

      // Re-testing tokens must continue to fail closed with UnauthorizedError
      await assert.rejects(
        () => sessionService.validateAndSlideSession(s1.token),
        (err: Error) => err instanceof UnauthorizedError,
      );
      await assert.rejects(
        () => sessionService.validateAndSlideSession(s2.token),
        (err: Error) => err instanceof UnauthorizedError,
      );

      // Active sessions count remains 0
      const activeAfterReactivation = await sessionService.listUserSessions(
        user.id,
        undefined,
        false,
      );
      assert.equal(activeAfterReactivation.length, 0);
    });
  });

  // 3. Password Change Immediate Revocation
  describe("Objective 3: Password Change Immediate Revocation", () => {
    it("changing user password immediately revokes all existing sessions with reason password_changed", async () => {
      const db = createAuditTestDb();
      const usersRepo = new UsersRepository(db);
      const rolesRepo = new RolesRepository(db);
      const sessionsRepo = new SessionsRepository(db);
      const hooks = new HookManager();
      const userService = new UserService(usersRepo, rolesRepo, sessionsRepo, hooks, stubLogger);
      const sessionService = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      const user = await usersRepo.create({
        email: "alice@example.com",
        passwordHash: "$2b$10$dummyHashValueForTestingPasswordStrengths123",
        roleIds: [],
        name: "Alice",
        status: "active",
      });

      const s1 = await sessionService.createSession(user.id, ["pages:read"]);
      const s2 = await sessionService.createSession(user.id, ["pages:read"]);

      // Verify active
      assert.equal((await sessionService.validateAndSlideSession(s1.token)).id, user.id);
      assert.equal((await sessionService.validateAndSlideSession(s2.token)).id, user.id);

      // Password change occurs (strong password passing strength validation)
      await userService.updateUser(
        user.id,
        { password: "NewStrongPassword2026!#" },
        "user-self-or-admin",
      );

      // Assert DB state: revoked with reason password_changed
      const doc1 = await sessionsRepo.findById(s1.sessionId);
      const doc2 = await sessionsRepo.findById(s2.sessionId);
      assert.equal(doc1?.status, "revoked");
      assert.equal(doc1?.revokeReason, "password_changed");
      assert.equal(doc1?.revokedBy, "user-self-or-admin");
      assert.equal(doc2?.status, "revoked");
      assert.equal(doc2?.revokeReason, "password_changed");

      // Old session tokens must fail closed
      await assert.rejects(
        () => sessionService.validateAndSlideSession(s1.token),
        (err: Error) => err instanceof UnauthorizedError,
      );
      await assert.rejects(
        () => sessionService.validateAndSlideSession(s2.token),
        (err: Error) => err instanceof UnauthorizedError,
      );
    });
  });

  // 4. Exact Millisecond Expiration Boundary
  describe("Objective 4: Exact Millisecond Expiration Boundary", () => {
    it("marks session as expired with revokeReason: expired when expiresAt is 1ms in the past", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      const session = await service.createSession("user-exp", ["pages:read"]);

      // Force expiresAt to 1ms in the past
      const pastDate = new Date(Date.now() - 1);
      await sessionsRepo.updateExpiresAt(session.sessionId, pastDate);

      // Validate must fail closed with UnauthorizedError
      await assert.rejects(
        () => service.validateAndSlideSession(session.token),
        (err: Error) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.equal(err.message, "Session has expired");
          return true;
        },
      );

      // DB record must be mutated to status: "expired" and revokeReason: "expired"
      const doc = await sessionsRepo.findById(session.sessionId);
      assert.ok(doc);
      assert.equal(doc.status, "expired");
      assert.equal(doc.revokeReason, "expired");
      assert.ok(doc.revokedAt instanceof Date);
    });

    it("marks session as expired when expiresAt is exactly equal to current millisecond (0ms boundary)", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      const session = await service.createSession("user-exp-exact", ["pages:read"]);

      // Set expiresAt to Date.now()
      const exactNow = new Date(Date.now());
      await sessionsRepo.updateExpiresAt(session.sessionId, exactNow);

      await assert.rejects(
        () => service.validateAndSlideSession(session.token),
        (err: Error) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.equal(err.message, "Session has expired");
          return true;
        },
      );

      const doc = await sessionsRepo.findById(session.sessionId);
      assert.ok(doc);
      assert.equal(doc.status, "expired");
      assert.equal(doc.revokeReason, "expired");
    });

    it("validates successfully when expiresAt is positive into the future", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      const session = await service.createSession("user-valid", ["pages:read"]);

      const futureDate = new Date(Date.now() + 60 * 1000);
      await sessionsRepo.updateExpiresAt(session.sessionId, futureDate);

      const user = await service.validateAndSlideSession(session.token);
      assert.equal(user.id, "user-valid");
    });
  });

  // 5. Adversarial Token & Header Tampering
  describe("Objective 5: Adversarial Token & Header Tampering", () => {
    it("rejects token with forged sessionId pointing to another user's session with UnauthorizedError", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      await service.createSession("user-A", ["pages:read"]);
      const userBSession = await service.createSession("user-B", ["pages:read"]);

      // Attacker signs a valid JWT using the system secret, but forges sessionId pointing to User B
      const forgedPayload = {
        userId: "user-A",
        sessionId: userBSession.sessionId,
        permissions: ["pages:read"],
      };
      const forgedToken = jwt.sign(forgedPayload, jwtSecret, {
        expiresIn: 3600,
        algorithm: "HS256",
      });

      // Must fail closed: session user mismatch
      await assert.rejects(
        () => service.validateAndSlideSession(forgedToken),
        (err: Error) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.equal(err.message, "Session does not belong to user");
          return true;
        },
      );
    });

    it("rejects token referencing a non-existent random sessionId with UnauthorizedError", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      const forgedPayload = {
        userId: "user-phantom",
        sessionId: "00000000-0000-0000-0000-000000000000",
        permissions: ["pages:read"],
      };
      const forgedToken = jwt.sign(forgedPayload, jwtSecret, {
        expiresIn: 3600,
        algorithm: "HS256",
      });

      await assert.rejects(
        () => service.validateAndSlideSession(forgedToken),
        (err: Error) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.equal(err.message, "Session has been revoked or expired");
          return true;
        },
      );
    });

    it("rejects token signed with an invalid/foreign secret key", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      const foreignToken = jwt.sign(
        { userId: "user-1", sessionId: "fake-id", permissions: [] },
        "foreign-untrusted-secret-key-32-chars-long",
        { expiresIn: 3600, algorithm: "HS256" },
      );

      await assert.rejects(
        () => service.validateAndSlideSession(foreignToken),
        (err: Error) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.equal(err.message, "Invalid or expired authentication token");
          return true;
        },
      );
    });

    it("rejects unsigned or algorithm none tokens", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      // Handcrafted alg: none JWT
      const headerB64 = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
        "base64url",
      );
      const payloadB64 = Buffer.from(
        JSON.stringify({ userId: "user-1", sessionId: "fake-id", permissions: [] }),
      ).toString("base64url");
      const noneToken = `${headerB64}.${payloadB64}.`;

      await assert.rejects(
        () => service.validateAndSlideSession(noneToken),
        (err: Error) => err instanceof UnauthorizedError,
      );
    });
  });

  // 6. BOLA / IDOR Verification on All Session Endpoints (Service Layer)
  describe("Objective 6: BOLA / IDOR Defenses on Session Management", () => {
    it("regular User A attempting deleteUserSession on User B's session is blocked with 403 ForbiddenError", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      const sessionA = await service.createSession("user-A", []);
      const sessionB = await service.createSession("user-B", []);

      // User A attempts to delete User B's session
      await assert.rejects(
        () =>
          service.deleteUserSession(sessionB.sessionId, {
            id: "user-A",
            permissions: ["pages:read"], // Lacks users:write or *
          }),
        (err: Error) => {
          assert.ok(err instanceof ForbiddenError);
          assert.equal(err.message, "You can only delete your own sessions");
          return true;
        },
      );

      // Session B must remain active
      const bDoc = await sessionsRepo.findById(sessionB.sessionId);
      assert.equal(bDoc?.status, "active");

      // User A CAN delete their own session
      await service.deleteUserSession(sessionA.sessionId, {
        id: "user-A",
        permissions: [],
      });
      const aDoc = await sessionsRepo.findById(sessionA.sessionId);
      assert.equal(aDoc?.status, "revoked");
      assert.equal(aDoc?.revokeReason, "self_revoked");
    });

    it("admin with users:write permission can delete any user's session with admin_revoked", async () => {
      const db = createAuditTestDb();
      const sessionsRepo = new SessionsRepository(db);
      const service = new SessionService(sessionsRepo, jwtSecret, stubLogger);

      const sessionB = await service.createSession("user-B", []);

      // Admin deletes User B's session
      await service.deleteUserSession(sessionB.sessionId, {
        id: "admin-1",
        permissions: ["users:write"],
      });

      const bDoc = await sessionsRepo.findById(sessionB.sessionId);
      assert.equal(bDoc?.status, "revoked");
      assert.equal(bDoc?.revokeReason, "admin_revoked");
      assert.equal(bDoc?.revokedBy, "admin-1");
    });
  });

  // 7. Granular Permissions Boundary Check
  describe("Objective 7: Granular Permissions Boundary Check (RBAC Matrix)", () => {
    it("user with pages:read and pages:write CANNOT access navigation or vault", () => {
      const editorPermissions = [PERMISSIONS.PAGES.READ, PERMISSIONS.PAGES.WRITE];

      // Pages access permitted
      assert.equal(hasPermission(editorPermissions, PERMISSIONS.PAGES.READ), true);
      assert.equal(hasPermission(editorPermissions, PERMISSIONS.PAGES.WRITE), true);

      // Cross-domain access strictly denied
      assert.equal(hasPermission(editorPermissions, PERMISSIONS.NAVIGATION.READ), false);
      assert.equal(hasPermission(editorPermissions, PERMISSIONS.NAVIGATION.WRITE), false);
      assert.equal(hasPermission(editorPermissions, PERMISSIONS.VAULT.READ), false);
      assert.equal(hasPermission(editorPermissions, PERMISSIONS.VAULT.WRITE), false);
      assert.equal(hasPermission(editorPermissions, PERMISSIONS.AUTH.USERS_READ), false);
      assert.equal(hasPermission(editorPermissions, PERMISSIONS.AUTH.USERS_WRITE), false);
    });

    it("user with vault:read CANNOT write or delete in vault", () => {
      const vaultAuditorPermissions = [PERMISSIONS.VAULT.READ];

      assert.equal(hasPermission(vaultAuditorPermissions, PERMISSIONS.VAULT.READ), true);
      assert.equal(hasPermission(vaultAuditorPermissions, PERMISSIONS.VAULT.WRITE), false);
    });

    it("user with namespace wildcard pages:* CANNOT access navigation or forms", () => {
      const wildcardPermissions = ["pages:*"];

      assert.equal(hasPermission(wildcardPermissions, PERMISSIONS.PAGES.READ), true);
      assert.equal(hasPermission(wildcardPermissions, PERMISSIONS.PAGES.WRITE), true);
      assert.equal(hasPermission(wildcardPermissions, PERMISSIONS.NAVIGATION.READ), false);
      assert.equal(hasPermission(wildcardPermissions, PERMISSIONS.FORMS.WRITE), false);
    });

    it("unauthenticated or empty permissions array fails closed on all resources", () => {
      assert.equal(hasPermission([], PERMISSIONS.PAGES.READ), false);
      assert.equal(hasPermission([], PERMISSIONS.AUTH.USERS_READ), false);
      assert.equal(hasPermission(undefined, PERMISSIONS.PAGES.READ), false);
    });

    it("superuser wildcard * grants access across all matrix endpoints", () => {
      const adminPerms = ["*"];
      assert.equal(hasPermission(adminPerms, PERMISSIONS.PAGES.READ), true);
      assert.equal(hasPermission(adminPerms, PERMISSIONS.NAVIGATION.WRITE), true);
      assert.equal(hasPermission(adminPerms, PERMISSIONS.VAULT.WRITE), true);
    });
  });
});
