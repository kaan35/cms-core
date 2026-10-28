import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PERMISSIONS } from "./permissions.js";

describe("Core Permissions Specifications and Integrity Audit", () => {
  it("defines granular navigation and vault permissions with exact values", () => {
    // Navigation permissions
    assert.equal(PERMISSIONS.NAVIGATION.READ, "navigation:read");
    assert.equal(PERMISSIONS.NAVIGATION.WRITE, "navigation:write");

    // Vault permissions
    assert.equal(PERMISSIONS.VAULT.READ, "vault:read");
    assert.equal(PERMISSIONS.VAULT.WRITE, "vault:write");
  });

  it("verifies all permission groups adhere to namespace:action format", () => {
    const groups = Object.entries(PERMISSIONS);
    assert.ok(groups.length > 0, "Permissions registry must not be empty");

    for (const [groupName, perms] of groups) {
      assert.ok(
        typeof perms === "object" && perms !== null,
        `Group ${groupName} must be an object`,
      );

      const groupKeys: string[] = [];
      for (const [key, value] of Object.entries(perms)) {
        assert.ok(
          typeof value === "string" && value.length > 0,
          `Permission ${groupName}.${key} must be a non-empty string`,
        );
        assert.match(
          value,
          /^[a-z0-9_-]+:[a-z0-9_:-]+$/,
          `Permission '${value}' must follow namespace:action pattern`,
        );
        groupKeys.push(value);
      }

      // Verify uniqueness within each namespace
      const uniqueGroupKeys = new Set(groupKeys);
      assert.equal(
        uniqueGroupKeys.size,
        groupKeys.length,
        `Permission string identifiers within group ${groupName} must be distinct`,
      );
    }
  });

  it("exports complete suite of domain permissions", () => {
    assert.ok(PERMISSIONS.AUTH.USERS_READ);
    assert.ok(PERMISSIONS.AUTH.USERS_WRITE);
    assert.ok(PERMISSIONS.AUTH.ROLES_READ);
    assert.ok(PERMISSIONS.AUTH.ROLES_WRITE);
    assert.ok(PERMISSIONS.AUTH.AUTH_REVOKE_ALL_SESSIONS);
    assert.ok(PERMISSIONS.SYSTEM.SETTINGS_READ);
    assert.ok(PERMISSIONS.SYSTEM.AUDIT_LOG_READ);
    assert.ok(PERMISSIONS.MEDIA.READ);
    assert.ok(PERMISSIONS.MEDIA.WRITE);
    assert.ok(PERMISSIONS.PAGES.READ);
    assert.ok(PERMISSIONS.PAGES.WRITE);
    assert.ok(PERMISSIONS.BLOG.READ);
    assert.ok(PERMISSIONS.BLOG.WRITE);
    assert.ok(PERMISSIONS.FORMS.READ);
    assert.ok(PERMISSIONS.FORMS.WRITE);
    assert.ok(PERMISSIONS.MCP.READ);
    assert.ok(PERMISSIONS.MCP.WRITE);
  });
});
