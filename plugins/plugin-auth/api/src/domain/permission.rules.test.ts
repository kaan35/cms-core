import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTH_PERMISSIONS, hasPermission } from "./permission.rules.js";

describe("permission.rules", () => {
  it("returns false for undefined or empty permissions", () => {
    assert.equal(hasPermission(undefined, AUTH_PERMISSIONS.USERS_READ), false);
    assert.equal(hasPermission([], AUTH_PERMISSIONS.USERS_READ), false);
  });

  it("super-admin wildcard '*' grants all permissions", () => {
    assert.equal(hasPermission(["*"], AUTH_PERMISSIONS.USERS_READ), true);
    assert.equal(hasPermission(["*"], AUTH_PERMISSIONS.AUTH_REVOKE_ALL_SESSIONS), true);
    assert.equal(hasPermission(["*"], "custom:permission"), true);
  });

  it("exact match grants permission", () => {
    assert.equal(hasPermission([AUTH_PERMISSIONS.USERS_READ], AUTH_PERMISSIONS.USERS_READ), true);
    assert.equal(hasPermission([AUTH_PERMISSIONS.USERS_READ], AUTH_PERMISSIONS.USERS_WRITE), false);
  });

  it("namespace wildcard grants all within namespace", () => {
    assert.equal(hasPermission(["users:*"], AUTH_PERMISSIONS.USERS_READ), true);
    assert.equal(hasPermission(["users:*"], AUTH_PERMISSIONS.USERS_WRITE), true);
    assert.equal(hasPermission(["users:*"], AUTH_PERMISSIONS.ROLES_READ), false);
  });
});
