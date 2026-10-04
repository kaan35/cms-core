import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { runCli } from "./index.js";
import { createNewProject } from "./newProject.js";

const BASE_TEST_DIR = path.resolve(os.tmpdir(), "cms-modular-test-sandbox");

describe("Modular Scaffolding & Plugin Profiles", { concurrency: 1 }, () => {
  before(async () => {
    await fs.rm(BASE_TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(BASE_TEST_DIR, { recursive: true });
  });

  after(async () => {
    await fs.rm(BASE_TEST_DIR, { recursive: true, force: true });
  });

  test("scaffolds api-only project with minimal profile", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-api-only");
    await fs.mkdir(testDir, { recursive: true });

    const projectName = "vault-api-only";
    const res = await createNewProject({
      projectName,
      targetDir: testDir,
      includeAdmin: false,
      includeClient: false,
      pluginsProfile: "minimal",
      apiPort: 5001,
    });

    assert.deepEqual(res.services, ["api", "mongo", "redis"]);
    assert.equal(res.ports.api, 5001);
    assert.equal(res.ports.admin, undefined);
    assert.equal(res.ports.client, undefined);

    const projectDir = path.join(testDir, projectName);

    // 1. docker-compose.yml check
    const composeContent = await fs.readFile(path.join(projectDir, "docker-compose.yml"), "utf-8");
    assert.ok(composeContent.includes("services:"));
    assert.ok(composeContent.includes("api:"));
    assert.ok(composeContent.includes("mongo:"));
    assert.ok(composeContent.includes("redis:"));
    assert.ok(!composeContent.includes("admin:"));
    assert.ok(!composeContent.includes("client:"));

    // 2. .env check
    const envContent = await fs.readFile(path.join(projectDir, ".env"), "utf-8");
    assert.ok(envContent.includes("PLUGINS_PROFILE=minimal"));
    assert.ok(!envContent.includes("ADMIN_PORT="));
    assert.ok(!envContent.includes("CLIENT_PORT="));
  });

  test("scaffolds minimal profile with admin but without client", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-vault-admin");
    await fs.mkdir(testDir, { recursive: true });

    const projectName = "vault-with-admin";
    const res = await createNewProject({
      projectName,
      targetDir: testDir,
      includeAdmin: true,
      includeClient: false,
      pluginsProfile: "minimal",
      apiPort: 6001,
      adminPort: 6002,
    });

    assert.deepEqual(res.services, ["api", "admin", "mongo", "redis"]);
    assert.equal(res.ports.api, 6001);
    assert.equal(res.ports.admin, 6002);
    assert.equal(res.ports.client, undefined);

    const projectDir = path.join(testDir, projectName);

    const composeContent = await fs.readFile(path.join(projectDir, "docker-compose.yml"), "utf-8");
    assert.ok(composeContent.includes("admin:"));
    assert.ok(!composeContent.includes("client:"));

    const envContent = await fs.readFile(path.join(projectDir, ".env"), "utf-8");
    assert.ok(envContent.includes("PLUGINS_PROFILE=minimal"));
    assert.ok(envContent.includes("ADMIN_PORT=6002"));
    assert.ok(!envContent.includes("CLIENT_PORT="));
    assert.ok(envContent.includes("CORS_ALLOWED_ORIGINS=http://localhost:6002"));
  });

  test("runCli parses --profile minimal --no-client --admin flags", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-runcli-modular");
    await fs.mkdir(testDir, { recursive: true });

    await runCli([
      "new",
      "cli-vault",
      "--dir",
      testDir,
      "--profile",
      "minimal",
      "--admin",
      "--no-client",
      "--api-port",
      "7001",
      "--admin-port",
      "7002",
    ]);

    const projectDir = path.join(testDir, "cli-vault");
    const envContent = await fs.readFile(path.join(projectDir, ".env"), "utf-8");
    assert.ok(envContent.includes("PLUGINS_PROFILE=minimal"));
    assert.ok(envContent.includes("ADMIN_PORT=7002"));

    const composeContent = await fs.readFile(path.join(projectDir, "docker-compose.yml"), "utf-8");
    assert.ok(composeContent.includes("admin:"));
    assert.ok(!composeContent.includes("client:"));
  });
});
