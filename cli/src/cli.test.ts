import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { runCli } from "./index.js";
import { createNewProject } from "./newProject.js";
import { upgradeProject } from "./upgradeProject.js";

const BASE_TEST_DIR = path.resolve(process.cwd(), "scratch/test-cli-sandbox");

describe("CMS CLI Engine", { concurrency: 1 }, () => {
  before(async () => {
    await fs.rm(BASE_TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(BASE_TEST_DIR, { recursive: true });
  });

  after(async () => {
    await fs.rm(BASE_TEST_DIR, { recursive: true, force: true });
  });

  test("scaffolds project with Next.js client (marketing-site shape)", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-marketing");
    await fs.mkdir(testDir, { recursive: true });

    const projectName = "test-corp-site";
    const res = await createNewProject({
      projectName,
      targetDir: testDir,
      includeClient: true,
      cmsTag: "latest",
      autoUpdate: true,
      apiPort: 3001,
      adminPort: 3002,
      clientPort: 3000,
    });

    assert.equal(res.includeClient, true);
    assert.deepEqual(res.services, ["api", "admin", "mongo", "redis", "client"]);
    assert.equal(res.ports.client, 3000);

    const projectDir = path.join(testDir, projectName);

    // 1. docker-compose.yml check
    const composeContent = await fs.readFile(path.join(projectDir, "docker-compose.yml"), "utf-8");
    assert.ok(composeContent.includes("services:"));
    assert.ok(composeContent.includes("client:"));
    assert.ok(composeContent.includes("image: kaan/cms-api:${CMS_TAG:-latest}"));
    assert.ok(composeContent.includes("target: ${CLIENT_TARGET:-runner}"));

    // Verify container environment isolation (Rule 10 & AppSec)
    const envFileOccurrences = composeContent.match(/env_file:\s*\.env/g) ?? [];
    assert.equal(envFileOccurrences.length, 1, "Only api service should declare env_file: .env");
    assert.ok(composeContent.includes("API_URL=http://api:3001"), "Admin/client should receive API_URL via environment");

    // 2. .env check
    const envContent = await fs.readFile(path.join(projectDir, ".env"), "utf-8");
    assert.ok(envContent.includes("CMS_TAG=latest"));
    assert.ok(envContent.includes("AUTO_UPDATE=true"));
    assert.ok(envContent.includes("NODE_ENV=production"));
    assert.ok(envContent.includes("RESTART_POLICY=unless-stopped"));
    assert.ok(envContent.includes("CLIENT_TARGET=runner"));
    assert.ok(envContent.includes("CLIENT_PORT=3000"));
    const secretMatch = envContent.match(/JWT_SECRET=([a-f0-9]{64})/);
    assert.ok(secretMatch, "JWT_SECRET should be a generated 64-character hex string");

    // 3. auto-update.sh check
    const scriptPath = path.join(projectDir, "scripts/auto-update.sh");
    const scriptStat = await fs.stat(scriptPath);
    assert.ok(scriptStat.isFile());
    assert.equal(scriptStat.mode & 0o111, 0o111, "auto-update.sh should be executable");

    // 4. root package.json check
    const rootPkg = JSON.parse(await fs.readFile(path.join(projectDir, "package.json"), "utf-8"));
    assert.equal(rootPkg.scripts.dev, "npm --prefix client run dev");
    assert.equal(rootPkg.scripts["docker:up"], "docker compose up -d");
    assert.equal(rootPkg.scripts["deps:install:api"], "docker compose exec api npm install");
    assert.equal(rootPkg.scripts["deps:install:admin"], "docker compose exec admin npm install");
    assert.equal(rootPkg.scripts["deps:upgrade:api"], "docker compose exec api npm up");
    assert.equal(rootPkg.scripts["deps:upgrade:admin"], "docker compose exec admin npm up");
    assert.equal(
      rootPkg.scripts["deps:upgrade"],
      "npm run deps:upgrade:api && npm run deps:upgrade:admin",
    );
    assert.equal(rootPkg.scripts["install:client"], "npm --prefix client install");
    assert.equal(
      rootPkg.scripts["install:deps"],
      "npm run deps:install:api && npm run deps:install:client",
    );
    assert.equal(rootPkg.scripts["install:api"], undefined);
    assert.equal(rootPkg.scripts.install, undefined);

    // 5. client-template check
    const clientPkg = await fs.readFile(path.join(projectDir, "client/package.json"), "utf-8");
    assert.ok(clientPkg.includes('"next"'));
    const clientDockerfile = await fs.readFile(path.join(projectDir, "client/Dockerfile"), "utf-8");
    assert.ok(clientDockerfile.includes("runner"));
    assert.ok(clientDockerfile.includes("dev"));
  });

  test("scaffolds project without client (custom-app shape)", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-custom");
    await fs.mkdir(testDir, { recursive: true });

    const projectName = "test-vault-app";
    const res = await createNewProject({
      projectName,
      targetDir: testDir,
      includeClient: false,
      autoUpdate: false,
      apiPort: 4001,
      adminPort: 4002,
    });

    assert.equal(res.includeClient, false);
    assert.deepEqual(res.services, ["api", "admin", "mongo", "redis"]);
    assert.equal(res.ports.client, undefined);

    const projectDir = path.join(testDir, projectName);

    // docker-compose should NOT contain client service
    const composeContent = await fs.readFile(path.join(projectDir, "docker-compose.yml"), "utf-8");
    assert.ok(!composeContent.includes("client:"));

    // Verify container isolation in custom-app shape (Rule 10 & AppSec)
    const envFileOccurrences = composeContent.match(/env_file:\s*\.env/g) ?? [];
    assert.equal(envFileOccurrences.length, 1, "Only api service should declare env_file: .env");
    assert.ok(composeContent.includes("API_URL=http://api:3001"), "Admin service should receive API_URL via environment");

    // client directory should NOT exist
    await assert.rejects(async () => {
      await fs.stat(path.join(projectDir, "client"));
    });

    // .env should have AUTO_UPDATE=false
    const envContent = await fs.readFile(path.join(projectDir, ".env"), "utf-8");
    assert.ok(envContent.includes("AUTO_UPDATE=false"));

    // package.json install script checks
    const rootPkg = JSON.parse(await fs.readFile(path.join(projectDir, "package.json"), "utf-8"));
    assert.equal(rootPkg.scripts["deps:install:api"], "docker compose exec api npm install");
    assert.equal(rootPkg.scripts["deps:install:admin"], "docker compose exec admin npm install");
    assert.equal(rootPkg.scripts["deps:upgrade:api"], "docker compose exec api npm up");
    assert.equal(rootPkg.scripts["deps:upgrade:admin"], "docker compose exec admin npm up");
    assert.equal(
      rootPkg.scripts["deps:upgrade"],
      "npm run deps:upgrade:api && npm run deps:upgrade:admin",
    );
    assert.equal(rootPkg.scripts["install:client"], undefined);
    assert.equal(rootPkg.scripts["install:deps"], "npm run deps:install:api");
    assert.equal(rootPkg.scripts["install:api"], undefined);
    assert.equal(rootPkg.scripts.install, undefined);
  });

  test("prevents scaffolding in non-empty directory", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-nonempty");
    const projectName = "existing-dir";
    const projectDir = path.join(testDir, projectName);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, "some-file.txt"), "hello");

    await assert.rejects(async () => {
      await createNewProject({
        projectName,
        targetDir: testDir,
      });
    }, /exists and is not empty/);
  });

  test("upgrades project CMS_TAG in .env", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-upgrade");
    const projectName = "upgradeable-app";
    const projectDir = path.join(testDir, projectName);
    await createNewProject({
      projectName,
      targetDir: testDir,
      cmsTag: "0.1.0",
    });

    const res1 = await upgradeProject({
      projectDir,
      targetVersion: "0.2.0",
    });

    assert.equal(res1.previousTag, "0.1.0");
    assert.equal(res1.newTag, "0.2.0");
    assert.equal(res1.envUpdated, true);

    const envContent = await fs.readFile(path.join(projectDir, ".env"), "utf-8");
    assert.ok(envContent.includes("CMS_TAG=0.2.0"));
    assert.ok(!envContent.includes("CMS_TAG=0.1.0"));

    // Idempotent upgrade
    const res2 = await upgradeProject({
      projectDir,
      targetVersion: "0.2.0",
    });
    assert.equal(res2.envUpdated, false);
  });

  test("runCli handles --help, --version, new, and upgrade", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-runcli");
    await fs.mkdir(testDir, { recursive: true });

    // Test help
    await runCli(["--help"]);

    // Test version
    await runCli(["--version"]);

    // Test new
    await runCli([
      "new",
      "cli-created-app",
      "--dir",
      testDir,
      "--no-client",
      "--cms-tag",
      "v1.0.0",
    ]);

    const envPath = path.join(testDir, "cli-created-app/.env");
    const envContent = await fs.readFile(envPath, "utf-8");
    assert.ok(envContent.includes("CMS_TAG=v1.0.0"));

    // Test upgrade
    await runCli(["upgrade", "v1.1.0", "--dir", path.join(testDir, "cli-created-app")]);
    const updatedEnv = await fs.readFile(envPath, "utf-8");
    assert.ok(updatedEnv.includes("CMS_TAG=v1.1.0"));
  });

  test("defaults to ./projects subdirectory when targetDir is omitted", async () => {
    const projectName = "test-subfolder-project";
    const expectedDir = path.resolve("projects", projectName);
    try {
      const res = await createNewProject({
        projectName,
      });
      assert.equal(res.projectDir, expectedDir);
      const stat = await fs.stat(path.join(expectedDir, "docker-compose.yml"));
      assert.ok(stat.isFile());
    } finally {
      await fs.rm(expectedDir, { recursive: true, force: true });
    }
  });

  test("scaffolds development mode with appropriate .env settings", async () => {
    const testDir = path.join(BASE_TEST_DIR, "case-dev-env");
    const projectName = "test-dev-project";
    const res = await createNewProject({
      projectName,
      targetDir: testDir,
      nodeEnv: "development",
    });
    const envContent = await fs.readFile(path.join(res.projectDir, ".env"), "utf-8");
    assert.ok(envContent.includes("NODE_ENV=development"));
    assert.ok(envContent.includes("LOG_LEVEL=debug"));
    assert.ok(envContent.includes("RESTART_POLICY=no"));
    assert.ok(envContent.includes("CLIENT_TARGET=dev"));
    assert.ok(envContent.includes("AUTO_UPDATE=false"));
  });
});
