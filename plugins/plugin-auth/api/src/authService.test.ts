import {
  ConflictError,
  ForbiddenError,
  HookManager,
  SettingsService,
  UnauthorizedError,
  ValidationError,
  stubLogger,
} from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthService } from "./authService.js";
import { RolesRepository } from "./repositories/rolesRepository.js";
import { SessionsRepository } from "./repositories/sessionsRepository.js";
import { UsersRepository } from "./repositories/usersRepository.js";
import { SessionService } from "./sessionService.js";

describe("AuthService unit tests", () => {
  const setupService = async (options: { setupEnabled?: boolean } = {}) => {
    const db = createInMemoryDb();
    const usersRepo = new UsersRepository(db);
    const rolesRepo = new RolesRepository(db);
    const sessionsRepo = new SessionsRepository(db);
    const settings = new SettingsService(db, stubLogger);
    const hooks = new HookManager();
    const sessionService = new SessionService(
      sessionsRepo,
      "test-secret-min-32-chars-long-please",
      stubLogger,
      24,
      15,
    );

    // Seed admin role
    await rolesRepo.create({ name: "admin", permissions: ["*"], isSystem: true });

    const authService = new AuthService(
      usersRepo,
      rolesRepo,
      sessionsRepo,
      sessionService,
      settings,
      hooks,
      stubLogger,
      4, // fast bcrypt salt for tests
      8,
      options.setupEnabled ?? true,
    );

    return { authService, settings, usersRepo, rolesRepo };
  };

  it("getSetupStatus returns needsSetup: true initially and false after setup", async () => {
    const { authService } = await setupService();
    const status1 = await authService.getSetupStatus();
    assert.deepEqual(status1, { needsSetup: true, setupEnabled: true });

    const result = await authService.setup("admin@example.com", "Password123");
    assert.equal(result.user.email, "admin@example.com");
    assert.deepEqual(result.user.permissions, ["*"]);

    const status2 = await authService.getSetupStatus();
    assert.deepEqual(status2, { needsSetup: false, setupEnabled: true });

    await assert.rejects(
      async () => authService.setup("another@example.com", "Password123"),
      ForbiddenError,
    );
  });

  it("register creates a user with empty roles and opens a session", async () => {
    const { authService } = await setupService();

    const result = await authService.register("user@example.com", "Password123");
    assert.equal(result.user.email, "user@example.com");
    assert.deepEqual(result.user.roleIds, []);
    assert.ok(result.session.token);

    // duplicate registration fails with ConflictError
    await assert.rejects(
      async () => authService.register("user@example.com", "Password123"),
      ConflictError,
    );
  });

  it("login authenticates valid credentials and rejects invalid", async () => {
    const { authService } = await setupService();
    await authService.register("user@example.com", "Password123");

    const loggedIn = await authService.login("user@example.com", "Password123");
    assert.equal(loggedIn.user.email, "user@example.com");
    assert.ok(loggedIn.session.token);

    await assert.rejects(
      async () => authService.login("user@example.com", "WrongPassword123"),
      UnauthorizedError,
    );
    await assert.rejects(
      async () => authService.login("nonexistent@example.com", "Password123"),
      UnauthorizedError,
    );
  });

  it("validates password strength and email format", async () => {
    const { authService } = await setupService();
    assert.throws(() => authService.validateEmail("invalid-email"), ValidationError);
    assert.throws(() => authService.validatePassword("short"), ValidationError);
    assert.throws(() => authService.validatePassword("nonumbershere"), ValidationError);
  });
});
