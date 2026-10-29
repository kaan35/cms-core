import {
  EVENTS,
  ForbiddenError,
  HookManager,
  SettingsService,
  UnauthorizedError,
  ValidationError,
  stubLogger,
} from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import type { FastifyReply, FastifyRequest } from "fastify";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAuthenticateMiddleware } from "../middleware/authenticate.js";
import { ApiTokensRepository } from "../repositories/apiTokensRepository.js";
import { RolesRepository } from "../repositories/rolesRepository.js";
import {
  SessionsRepository,
  type SessionRevokeReason,
} from "../repositories/sessionsRepository.js";
import { UsersRepository } from "../repositories/usersRepository.js";
import { SessionService } from "../sessionService.js";
import { AuthService } from "./AuthService.js";
import { UserService } from "./UserService.js";

interface TestContext {
  db: ReturnType<typeof createInMemoryDb>;
  usersRepo: UsersRepository;
  rolesRepo: RolesRepository;
  sessionsRepo: SessionsRepository;
  apiTokensRepo: ApiTokensRepository;
  settings: SettingsService;
  hooks: HookManager;
  sessionService: SessionService;
  userService: UserService;
  authService: AuthService;
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

async function setupTestContext(): Promise<TestContext> {
  const db = createInMemoryDb();
  const usersRepo = new UsersRepository(db);
  const rolesRepo = new RolesRepository(db);
  const sessionsRepo = new SessionsRepository(db);
  const apiTokensRepo = new ApiTokensRepository(db);
  const settings = new SettingsService(db, stubLogger);
  const hooks = new HookManager();
  const jwtSecret = "super-secure-jwt-secret-minimum-32-chars-long-here";
  const sessionService = new SessionService(sessionsRepo, jwtSecret, stubLogger, 24, 15);

  await rolesRepo.create({ name: "admin", permissions: ["*"], isSystem: true });
  await rolesRepo.create({ name: "user", permissions: ["user:read"], isSystem: true });

  const userService = new UserService(
    usersRepo,
    rolesRepo,
    sessionsRepo,
    hooks,
    stubLogger,
    4,
    apiTokensRepo,
  );

  const authService = new AuthService(
    usersRepo,
    rolesRepo,
    sessionsRepo,
    sessionService,
    settings,
    hooks,
    stubLogger,
    4,
    8,
    true,
  );

  const authenticate = createAuthenticateMiddleware(sessionService, usersRepo, rolesRepo);

  return {
    db,
    usersRepo,
    rolesRepo,
    sessionsRepo,
    apiTokensRepo,
    settings,
    hooks,
    sessionService,
    userService,
    authService,
    authenticate,
  };
}

function makeMockRequest(options: {
  token?: string;
  cookieToken?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}): FastifyRequest {
  const headers: Record<string, string> = { ...options.headers };
  if (options.token) {
    headers["authorization"] = `Bearer ${options.token}`;
  }
  const cookies: Record<string, string> = { ...options.cookies };
  if (options.cookieToken) {
    cookies["token"] = options.cookieToken;
  }
  return {
    headers,
    cookies,
    user: undefined,
  } as unknown as FastifyRequest;
}

const mockReply = {} as FastifyReply;

describe("User Suspension Specifications and Adversarial QA Suite", () => {
  describe("Acceptance Criterion 1: Default Active Status on User Creation", () => {
    it("creates user with default status active when status is omitted", async () => {
      const { userService, usersRepo } = await setupTestContext();

      const created = await userService.createUser({
        email: "alice@example.com",
        password: "Password123",
        name: "Alice Smith",
      });

      assert.equal(created.status, "active");

      const byId = await userService.getUserById(created.id);
      assert.equal(byId.status, "active");

      const doc = await usersRepo.findById(created.id);
      assert.ok(doc);
      assert.equal(doc.status, "active");

      const paginated = await userService.listUsers(1, 10);
      const userInList = paginated.data.find((u) => u.id === created.id);
      assert.ok(userInList);
      assert.equal(userInList.status, "active");
    });

    it("creates user with explicit active status", async () => {
      const { userService } = await setupTestContext();

      const created = await userService.createUser({
        email: "bob@example.com",
        password: "Password123",
        status: "active",
      });

      assert.equal(created.status, "active");
    });

    it("creates user directly in suspended status when explicitly requested", async () => {
      const { userService } = await setupTestContext();

      const created = await userService.createUser({
        email: "charlie@example.com",
        password: "Password123",
        status: "suspended",
      });

      assert.equal(created.status, "suspended");
      const byId = await userService.getUserById(created.id);
      assert.equal(byId.status, "suspended");
    });
  });

  describe("Acceptance Criterion 2: User Suspension Lifecycle, Session Revocation, and Event Emission", () => {
    it("suspends user, revokes all user sessions, and emits USER_UPDATED event with status", async () => {
      const { userService, sessionsRepo, sessionService, hooks } = await setupTestContext();

      const user = await userService.createUser({
        email: "target@example.com",
        password: "Password123",
        name: "Target User",
      });

      const otherUser = await userService.createUser({
        email: "other@example.com",
        password: "Password123",
        name: "Other User",
      });

      // Create active sessions for target user
      const targetSession1 = await sessionService.createSession(user.id, ["user:read"]);
      const targetSession2 = await sessionService.createSession(user.id, ["user:read"]);
      assert.ok(targetSession1.token);
      assert.ok(targetSession2.token);

      // Create active session for other user to test isolation
      const otherSession = await sessionService.createSession(otherUser.id, ["user:read"]);
      assert.ok(otherSession.token);

      // Verify sessions exist in repository before suspension
      const sessionsBefore = await sessionsRepo.findByUserId(user.id);
      assert.equal(sessionsBefore.length, 2);

      const otherSessionsBefore = await sessionsRepo.findByUserId(otherUser.id);
      assert.equal(otherSessionsBefore.length, 1);

      // Track revokeByUserId call
      let revokeByUserIdCalledWith: {
        id: string;
        actorId?: string | undefined;
        reason?: SessionRevokeReason | undefined;
      } | null = null;
      const originalRevokeByUserId = sessionsRepo.revokeByUserId.bind(sessionsRepo);
      sessionsRepo.revokeByUserId = async (
        id: string,
        actorId?: string,
        reason?: SessionRevokeReason,
      ) => {
        revokeByUserIdCalledWith = { id, actorId, reason };
        return originalRevokeByUserId(id, actorId, reason);
      };

      // Track emitted events
      const emittedEvents: Array<{ event: string; payload: unknown }> = [];
      hooks.on(EVENTS.AUTH.USER_UPDATED, async (payload) => {
        emittedEvents.push({ event: EVENTS.AUTH.USER_UPDATED, payload });
      });

      // Execute suspension
      const updated = await userService.updateUser(user.id, { status: "suspended" });

      // 1. Verify returned user and persisted state
      assert.equal(updated.status, "suspended");
      const fetched = await userService.getUserById(user.id);
      assert.equal(fetched.status, "suspended");

      // 2. Verify SessionsRepository.revokeByUserId was called immediately with user_suspended
      assert.equal(
        (revokeByUserIdCalledWith as { id: string; reason?: string } | null)?.id,
        user.id,
      );
      assert.equal(
        (revokeByUserIdCalledWith as { id: string; reason?: string } | null)?.reason,
        "user_suspended",
      );

      // 3. Verify user active sessions count is 0, but history retains revoked sessions
      const sessionsAfter = await sessionsRepo.findByUserId(user.id);
      assert.equal(sessionsAfter.length, 0);

      const historyAfter = await sessionsRepo.findByUserId(user.id, { includeRevoked: true });
      assert.equal(historyAfter.length, 2);
      assert.equal(historyAfter[0]?.status, "revoked");
      assert.equal(historyAfter[0]?.revokeReason, "user_suspended");
      assert.equal(historyAfter[1]?.status, "revoked");
      assert.equal(historyAfter[1]?.revokeReason, "user_suspended");

      // 4. Verify validateAndSlideSession fails closed
      await assert.rejects(
        () => sessionService.validateAndSlideSession(targetSession1.token),
        UnauthorizedError,
      );

      // 5. Verify other user's session was NOT revoked
      const otherSessionsAfter = await sessionsRepo.findByUserId(otherUser.id);
      assert.equal(otherSessionsAfter.length, 1);

      // 6. Verify EVENTS.AUTH.USER_UPDATED was emitted with { userId, status: "suspended" }
      assert.equal(emittedEvents.length, 1);
      assert.deepEqual(emittedEvents[0]?.payload, {
        userId: user.id,
        status: "suspended",
      });
    });

    it("emits standard payload when updateUser is called without suspension", async () => {
      const { userService, hooks } = await setupTestContext();

      const user = await userService.createUser({
        email: "standard@example.com",
        password: "Password123",
      });

      const emittedEvents: Array<{ event: string; payload: unknown }> = [];
      hooks.on(EVENTS.AUTH.USER_UPDATED, async (payload) => {
        emittedEvents.push({ event: EVENTS.AUTH.USER_UPDATED, payload });
      });

      await userService.updateUser(user.id, { name: "Updated Name" }, "admin-actor-id");

      assert.equal(emittedEvents.length, 1);
      assert.deepEqual(emittedEvents[0]?.payload, {
        userId: user.id,
        actorId: "admin-actor-id",
      });
    });
  });

  describe("Acceptance Criterion 3: Adversarial Auth & Login Timing Protection", () => {
    it("rejects suspended user login with ForbiddenError when password is correct", async () => {
      const { userService, authService } = await setupTestContext();

      const user = await userService.createUser({
        email: "suspended.correct@example.com",
        password: "ValidPassword123",
      });

      await userService.updateUser(user.id, { status: "suspended" });

      await assert.rejects(
        async () => {
          await authService.login("suspended.correct@example.com", "ValidPassword123");
        },
        (err: unknown) => {
          assert.ok(err instanceof ForbiddenError, "Should throw ForbiddenError");
          assert.match((err as Error).message, /Account is suspended/i);
          return true;
        },
      );
    });

    it("rejects suspended user login with UnauthorizedError when password is wrong to mitigate timing attack and enumeration", async () => {
      const { userService, authService } = await setupTestContext();

      const user = await userService.createUser({
        email: "suspended.wrong@example.com",
        password: "CorrectPassword123",
      });

      await userService.updateUser(user.id, { status: "suspended" });

      await assert.rejects(
        async () => {
          await authService.login("suspended.wrong@example.com", "IncorrectPassword999");
        },
        (err: unknown) => {
          assert.ok(
            err instanceof UnauthorizedError,
            "Should throw UnauthorizedError, not ForbiddenError",
          );
          assert.equal((err as Error).message, "Invalid email or password");
          return true;
        },
      );
    });

    it("rejects non-existent email with UnauthorizedError", async () => {
      const { authService } = await setupTestContext();

      await assert.rejects(
        async () => {
          await authService.login("nonexistent@example.com", "Password123");
        },
        (err: unknown) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.equal((err as Error).message, "Invalid email or password");
          return true;
        },
      );
    });

    it("restores login capability when suspended user is reactivated", async () => {
      const { userService, authService } = await setupTestContext();

      const user = await userService.createUser({
        email: "reactivated@example.com",
        password: "Password123",
      });

      // Suspend
      await userService.updateUser(user.id, { status: "suspended" });
      await assert.rejects(
        async () => authService.login("reactivated@example.com", "Password123"),
        ForbiddenError,
      );

      // Reactivate
      const reactivated = await userService.updateUser(user.id, { status: "active" });
      assert.equal(reactivated.status, "active");

      // Login succeeds
      const result = await authService.login("reactivated@example.com", "Password123");
      assert.equal(result.user.email, "reactivated@example.com");
      assert.ok(result.session.token);
    });
  });

  describe("Acceptance Criterion 4: Adversarial Middleware Authorization Enforcement", () => {
    it("fails closed with ForbiddenError when suspended user presents valid session token via Authorization header", async () => {
      const { userService, sessionService, authenticate } = await setupTestContext();

      const user = await userService.createUser({
        email: "header.test@example.com",
        password: "Password123",
      });

      // Create session while active
      const session = await sessionService.createSession(user.id, ["user:read"]);

      // Verify token passes while active
      const activeReq = makeMockRequest({ token: session.token });
      await authenticate(activeReq, mockReply);
      assert.equal(activeReq.user?.id, user.id);

      // Suspend user (this revokes sessions)
      await userService.updateUser(user.id, { status: "suspended" });

      // If the session was revoked, authenticate throws UnauthorizedError;
      // if session survives, it throws ForbiddenError. In both cases, suspended user is blocked.
      const suspendedReq = makeMockRequest({ token: session.token });
      await assert.rejects(
        async () => {
          await authenticate(suspendedReq, mockReply);
        },
        (err: unknown) => {
          assert.ok(
            err instanceof ForbiddenError || err instanceof UnauthorizedError,
            "Must reject with ForbiddenError or UnauthorizedError",
          );
          return true;
        },
      );
    });

    it("fails closed when suspended user presents revoked session token via cookie", async () => {
      const { userService, sessionService, authenticate } = await setupTestContext();

      const user = await userService.createUser({
        email: "cookie.test@example.com",
        password: "Password123",
      });

      const session = await sessionService.createSession(user.id, ["user:read"]);

      // Suspend user (this revokes sessions)
      await userService.updateUser(user.id, { status: "suspended" });

      const cookieReq = makeMockRequest({ cookieToken: session.token });
      await assert.rejects(
        async () => {
          await authenticate(cookieReq, mockReply);
        },
        (err: unknown) => {
          assert.ok(
            err instanceof ForbiddenError || err instanceof UnauthorizedError,
            "Must reject with ForbiddenError or UnauthorizedError",
          );
          return true;
        },
      );
    });

    it("blocks request even if a session survived or was re-inserted into repository while user is suspended", async () => {
      const { userService, sessionsRepo, sessionService, authenticate } = await setupTestContext();

      const user = await userService.createUser({
        email: "survived.session@example.com",
        password: "Password123",
      });

      // Directly mark user as suspended in DB
      await userService.updateUser(user.id, { status: "suspended" });

      // Manually forge/insert a live session for this suspended user
      const forgedSession = await sessionService.createSession(user.id, ["admin"]);
      const sessionsInDb = await sessionsRepo.findByUserId(user.id);
      assert.equal(sessionsInDb.length, 1);

      // Middleware must fail closed on userDoc.status check
      const req = makeMockRequest({ token: forgedSession.token });
      await assert.rejects(
        async () => {
          await authenticate(req, mockReply);
        },
        (err: unknown) => {
          assert.ok(err instanceof ForbiddenError);
          assert.equal((err as Error).message, "Account is suspended");
          return true;
        },
      );
    });

    it("permits active user with valid session token", async () => {
      const { userService, sessionService, authenticate } = await setupTestContext();

      const user = await userService.createUser({
        email: "active.user@example.com",
        password: "Password123",
      });

      const session = await sessionService.createSession(user.id, ["user:read"]);
      const req = makeMockRequest({ token: session.token });

      await authenticate(req, mockReply);
      assert.equal(req.user?.id, user.id);
      assert.equal(req.user?.email, "active.user@example.com");
    });
  });

  describe("Validation & Defensive Invariants", () => {
    it("rejects invalid status values on user creation", async () => {
      const { userService } = await setupTestContext();

      await assert.rejects(async () => {
        await userService.createUser({
          email: "invalid.status@example.com",
          password: "Password123",
          status: "banned" as unknown as "active",
        });
      }, ValidationError);
    });

    it("rejects invalid status values on user update", async () => {
      const { userService } = await setupTestContext();

      const user = await userService.createUser({
        email: "valid.user@example.com",
        password: "Password123",
      });

      await assert.rejects(async () => {
        await userService.updateUser(user.id, {
          status: "archived" as unknown as "active",
        });
      }, ValidationError);
    });

    it("does not mutate status when status is omitted from update payload", async () => {
      const { userService } = await setupTestContext();

      const user = await userService.createUser({
        email: "status.retain@example.com",
        password: "Password123",
      });

      await userService.updateUser(user.id, { status: "suspended" });
      const afterSuspend = await userService.getUserById(user.id);
      assert.equal(afterSuspend.status, "suspended");

      // Update name only, status must remain suspended
      const afterNameUpdate = await userService.updateUser(user.id, { name: "New Name" });
      assert.equal(afterNameUpdate.status, "suspended");
      assert.equal(afterNameUpdate.name, "New Name");

      const fetchedAgain = await userService.getUserById(user.id);
      assert.equal(fetchedAgain.status, "suspended");
    });

    it("deleteUser revokes all active API tokens for the user", async () => {
      const { userService, apiTokensRepo } = await setupTestContext();

      const user = await userService.createUser({
        email: "delete.tokens@example.com",
        password: "Password123",
      });

      const token = await apiTokensRepo.create({
        userId: user.id,
        name: "Test Token",
        tokenHash: "dummy-hash",
        tokenPrefix: "cms_token_...1234",
        scopes: ["*"],
        expiresAt: null,
      });

      assert.strictEqual(token.revokedAt, null);

      await userService.deleteUser(user.id, "admin-caller-id", "admin-caller-id");

      const revokedToken = await apiTokensRepo.findById(token.id);
      assert.ok(revokedToken?.revokedAt);
      assert.strictEqual(revokedToken?.revokeReason, "user_deleted");
    });
  });
});
