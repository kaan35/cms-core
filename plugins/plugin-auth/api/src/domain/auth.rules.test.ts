import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateCreateRole,
  validateCreateUser,
  validateLogin,
  validateRegister,
  validateSetup,
  validateUpdateUser,
} from "./auth.rules.js";

describe("auth.rules Zod validation", () => {
  it("validates valid login credentials and normalizes email", () => {
    const res = validateLogin({ email: " ADMIN@EXAMPLE.COM ", password: "secretPassword1" });
    assert.equal(res.email, "admin@example.com");
    assert.equal(res.password, "secretPassword1");
  });

  it("rejects invalid email formats in login", () => {
    assert.throws(
      () => validateLogin({ email: "invalid-email", password: "pwd" }),
      /ValidationError/,
    );
  });

  it("validates register payload with strong password", () => {
    const res = validateRegister({
      email: "user@example.com",
      password: "validPassword123",
      name: "John Doe",
    });
    assert.equal(res.name, "John Doe");
  });

  it("rejects weak passwords missing digits or too short", () => {
    assert.throws(
      () =>
        validateRegister({
          email: "user@example.com",
          password: "short",
          name: "John",
        }),
      /ValidationError/,
    );
  });

  it("validates setup payload and optional siteTitle", () => {
    const res = validateSetup({
      email: "admin@test.com",
      password: "password123",
      name: "Super Admin",
      siteTitle: "My CMS Site",
    });
    assert.equal(res.siteTitle, "My CMS Site");
  });

  it("validates create role requiring at least one permission", () => {
    const res = validateCreateRole({
      name: "editor",
      description: "Content Editor",
      permissions: ["pages:write", "media:upload"],
    });
    assert.equal(res.permissions.length, 2);

    assert.throws(() => validateCreateRole({ name: "empty", permissions: [] }), /ValidationError/);
  });

  it("validates create user payload", () => {
    const res = validateCreateUser({
      email: "newuser@example.com",
      password: "validPassword123",
      roleIds: ["role-1"],
    });
    assert.equal(res.email, "newuser@example.com");
    assert.deepEqual(res.roleIds, ["role-1"]);
  });

  it("validates partial update user", () => {
    const res = validateUpdateUser({ name: "Updated Name" });
    assert.equal(res.name, "Updated Name");
    assert.equal(res.email, undefined);
  });
});
