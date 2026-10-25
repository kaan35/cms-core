import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { runCli } from "./index.js";
import { createNewProject } from "./newProject.js";
import { findAvailablePort, isPortAvailable, resolveProjectPorts } from "./utils/ports.js";

const BASE_TEST_DIR = path.resolve(os.tmpdir(), "cms-modular-test-sandbox");

describe("Modular Scaffolding & Plugin Selection", { concurrency: 1 }, () => {
  before(async () => {
    await fs.rm(BASE_TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(BASE_TEST_DIR, { recursive: true });
  });

  after(async () => {
    await fs.rm(BASE_TEST_DIR, { recursive: true, force: true });
  });

  test("scaffolds api-only project with minimal plugins", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-api-only");
    await fs.mkdir(testDir, { recursive: true });

    const projectName = "vault-api-only";
    const res = await createNewProject({
      projectName,
      targetDir: testDir,
      includeAdmin: false,
      includeClient: false,
      plugins: "minimal",
      apiPort: 5001,
      redisPort: 6380,
    });

    assert.deepEqual(res.services, ["api", "mongo", "redis"]);
    assert.equal(res.ports.api, 5001);
    assert.equal(res.ports.admin, undefined);
    assert.equal(res.ports.client, undefined);
    assert.equal(res.ports.redis, 6380);

    const projectDir = path.join(testDir, projectName);

    // 1. docker-compose.yml check
    const composeContent = await fs.readFile(path.join(projectDir, "docker-compose.yml"), "utf-8");
    assert.ok(composeContent.includes("services:"));
    assert.ok(composeContent.includes("api:"));
    assert.ok(
      composeContent.includes("image: ${CMS_REGISTRY:-ghcr.io/kaan35}/cms-api:${CMS_TAG:-latest}"),
    );
    assert.ok(!composeContent.includes("command:"));
    assert.ok(composeContent.includes("mongo:"));
    assert.ok(composeContent.includes('"${MONGO_PORT:-27017}:27017"'));
    assert.ok(composeContent.includes("redis:"));
    assert.ok(composeContent.includes('"${REDIS_PORT:-6379}:6379"'));
    assert.ok(!composeContent.includes("admin:"));
    assert.ok(!composeContent.includes("client:"));

    const devComposeContent = await fs.readFile(
      path.join(projectDir, "docker-compose.dev.yml"),
      "utf-8",
    );
    assert.ok(devComposeContent.includes("image: !reset null"));
    assert.ok(devComposeContent.includes("context: ${CMS_CORE_PATH:-../..}"));
    assert.ok(!devComposeContent.includes("admin:"));

    // 2. .env check
    const envContent = await fs.readFile(path.join(projectDir, ".env"), "utf-8");
    assert.ok(envContent.includes("CMS_REGISTRY=ghcr.io/kaan35"));
    assert.ok(envContent.includes("CMS_CORE_PATH="));
    assert.ok(envContent.includes("PLUGINS=minimal"));
    assert.ok(envContent.includes("REDIS_PORT=6380"));
    assert.ok(!envContent.includes("ADMIN_PORT="));
    assert.ok(!envContent.includes("CLIENT_PORT="));
  });

  test("scaffolds minimal plugins with admin but without client", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-vault-admin");
    await fs.mkdir(testDir, { recursive: true });

    const projectName = "vault-with-admin";
    const res = await createNewProject({
      projectName,
      targetDir: testDir,
      includeAdmin: true,
      includeClient: false,
      plugins: "minimal",
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
    assert.ok(!composeContent.includes("command:"));

    const envContent = await fs.readFile(path.join(projectDir, ".env"), "utf-8");
    assert.ok(envContent.includes("PLUGINS=minimal"));
    assert.ok(envContent.includes("ADMIN_PORT=6002"));
    assert.ok(!envContent.includes("CLIENT_PORT="));
    assert.ok(envContent.includes("CORS_ALLOWED_ORIGINS=http://localhost:6002"));
  });

  test("runCli parses --plugins vault and custom comma-separated plugins", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-runcli-modular");
    await fs.mkdir(testDir, { recursive: true });

    await runCli([
      "new",
      "cli-vault",
      "--dir",
      testDir,
      "--plugins",
      "vault",
      "--admin",
      "--no-client",
      "--api-port",
      "7001",
      "--admin-port",
      "7002",
      "--mongo-port",
      "7003",
      "--redis-port",
      "7004",
    ]);

    const projectDir = path.join(testDir, "cli-vault");
    const envContent = await fs.readFile(path.join(projectDir, ".env"), "utf-8");
    assert.ok(envContent.includes("PLUGINS=vault"));
    assert.ok(envContent.includes("CMS_REGISTRY=ghcr.io/kaan35"));
    assert.ok(envContent.includes("CMS_CORE_PATH="));
    assert.ok(envContent.includes("ADMIN_PORT=7002"));
    assert.ok(envContent.includes("MONGO_PORT=7003"));
    assert.ok(envContent.includes("REDIS_PORT=7004"));

    const composeContent = await fs.readFile(path.join(projectDir, "docker-compose.yml"), "utf-8");
    assert.ok(composeContent.includes("admin:"));
    assert.ok(!composeContent.includes("client:"));
    assert.ok(!composeContent.includes("command:"));
  });

  test("isPortAvailable detects free ports", async () => {
    const freePort = 19999;
    const isFree = await isPortAvailable(freePort);
    assert.equal(isFree, true);
  });

  test("isPortAvailable rejects invalid ports", async () => {
    assert.equal(await isPortAvailable(0), false);
    assert.equal(await isPortAvailable(70000), false);
    assert.equal(await isPortAvailable(Number.NaN), false);
  });

  test("findAvailablePort returns first available port", async () => {
    const port = await findAvailablePort(19950);
    assert.ok(port >= 19950);
  });

  test("resolveProjectPorts resolves defaults and respects explicit/omitted flags", async () => {
    // 1. All explicit ports
    const explicitPorts = await resolveProjectPorts({
      apiPort: 18001,
      adminPort: 18002,
      clientPort: 18003,
      mongoPort: 18004,
      redisPort: 18005,
      includeClient: true,
    });
    assert.equal(explicitPorts.apiPort, 18001);
    assert.equal(explicitPorts.adminPort, 18002);
    assert.equal(explicitPorts.clientPort, 18003);
    assert.equal(explicitPorts.mongoPort, 18004);
    assert.equal(explicitPorts.redisPort, 18005);
    assert.equal(explicitPorts.autoShifted.length, 0);

    // 2. Conflicting explicit ports get shifted with explicit: true
    const conflictingPorts = await resolveProjectPorts({
      apiPort: 18010,
      adminPort: 18010, // Collides with apiPort in the same batch
    });
    assert.equal(conflictingPorts.apiPort, 18010);
    assert.equal(conflictingPorts.adminPort, 18011);
    const shiftedAdmin = conflictingPorts.autoShifted.find((s) => s.name === "Admin");
    assert.ok(shiftedAdmin);
    assert.equal(shiftedAdmin.requested, 18010);
    assert.equal(shiftedAdmin.assigned, 18011);
    assert.equal(shiftedAdmin.explicit, true);

    // 3. Omitted ports use standard defaults (API: 3001, Admin: 3002, Client: 3003, Mongo: 27017, Redis: 6379)
    const defaultPorts = await resolveProjectPorts({});
    assert.ok(defaultPorts.apiPort >= 3001);
    assert.ok(defaultPorts.adminPort !== undefined && defaultPorts.adminPort >= 3002);
    assert.equal(defaultPorts.clientPort, undefined);
    assert.ok(defaultPorts.mongoPort >= 27017);
    assert.ok(defaultPorts.redisPort >= 6379);

    const clientDefaultPorts = await resolveProjectPorts({ includeClient: true });
    assert.ok(clientDefaultPorts.clientPort !== undefined && clientDefaultPorts.clientPort >= 3003);

    // For any auto-shifted omitted port, explicit must be false
    for (const shift of defaultPorts.autoShifted) {
      assert.equal(shift.explicit, false);
    }
  });
});
