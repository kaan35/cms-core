# CMS Core — Architecture

> Decisions, patterns, and the reasoning behind them. For coding conventions see [`CODING_STANDARDS.md`](./CODING_STANDARDS.md).

---

## Table of Contents

1. [Service Wiring & Interfaces](#1-service-wiring--interfaces)
2. [Dependency Injection Rules](#2-dependency-injection-rules)
3. [Design Patterns](#3-design-patterns)
4. [API Layer](#4-api-layer)
5. [Admin Layer](#5-admin-layer)
6. [Testing Strategy](#6-testing-strategy)
7. [CLI Tool Design](#7-cli-tool-design)
8. [Quick Reference](#8-quick-reference)

---

## 1. Service Wiring & Interfaces

All shared interfaces (`ILogger`, `IDatabase`, `ICache`) are defined once in `@cms/core`. No service re-declares an interface it doesn't own.

```typescript
// packages/core/src/types/ILogger.ts
export interface ILogger {
  info(message: string, ...args: unknown[]): void;
  error(data: unknown, message: string): void;
  warn(message: string, ...args: unknown[]): void;
  debug?(message: string, ...args: unknown[]): void; // optional
}

// packages/core/src/types/IDatabase.ts
export interface IDatabase {
  connect(config: DatabaseConfig, logger: ILogger): Promise<void>;
  disconnect(): Promise<void>;
  getDb(): Db | null;
  getClient(): MongoClient | null;
  getCollection<T = any>(name: string): Collection<T>;
}

// packages/core/src/types/ICache.ts
export interface ICache {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  isAlive(): boolean;
}

// packages/core/src/index.ts
export type { ILogger } from "./types/ILogger.ts";
export type { IDatabase } from "./types/IDatabase.ts";
export type { ICache } from "./types/ICache.ts";
```

**Fastify module augmentation** — plugins get typed access without importing concrete classes:

```typescript
// packages/core/src/types/fastify.d.ts
declare module "fastify" {
  interface FastifyInstance {
    db: IDatabase; // interface, not DatabaseService
    cache: ICache;
    logger: ILogger;
    config: Config;
  }
}
```

**`ILogger` (interface) vs `logger` (instance):**

|           | What                                      | Where from                                 |
| --------- | ----------------------------------------- | ------------------------------------------ |
| `ILogger` | TypeScript type — compile-time only       | `import type { ILogger } from "@cms/core"` |
| `logger`  | Running Pino instance — exists at runtime | `import { logger } from "@cms/core"`       |

- **Services** → depend on `ILogger` (type safety)
- **Plugins** → read `app.logger` from the Fastify decorator
- **`main.ts`** → uses the `logger` singleton directly

---

## 2. Dependency Injection Rules

### Rule 1 — Depend on the interface, not the concrete class

```typescript
constructor(private logger: ILogger)    // ✅ swappable, testable
constructor(private logger: LogService) // ❌ locked to implementation
```

Same rule applies to Fastify augmentation:

```typescript
interface FastifyInstance {
  db: IDatabase; // ✅
  db: DatabaseService; // ❌
}
```

When the implementation changes (e.g. MongoDB → PostgreSQL), only one file changes. Services and plugins are unaffected.

### Rule 2 — Constructor parameters are required, never optional

```typescript
// ✅ — dependency is guaranteed to exist
constructor(
  private readonly database: IDatabase,
  private readonly logger: ILogger,
) {}

runBackup() {
  this.database.getDb(); // no ?. needed
}

// ❌ — hides wiring mistakes, forces ?. everywhere
constructor(
  private database?: IDatabase,
  private logger?: ILogger,
) {}

runBackup() {
  this.database?.getDb(); // could silently do nothing
}
```

TypeScript catches missing dependencies at compile time, not at runtime.

### Rule 3 — Plugins read from `app.*`, never import services directly

```typescript
// ✅ — testable; decorate a stub Fastify instance and inject requests
async function register(fastify: FastifyInstance) {
  const db = fastify.db;
  const logger = fastify.logger;
}

// ❌ — bypasses DI, can't be tested without a real MongoDB connection
import { database } from "@cms/db";
async function register(fastify: FastifyInstance) {
  const posts = await database.getCollection("posts").find();
}
```

---

## 3. Design Patterns

### Constructor Injection

Dependencies are passed in, never constructed inside the class.

```typescript
// ❌ — DatabaseService creates its own logger; can't swap it in tests
class DatabaseService {
  private logger = new LogService();
}

// ✅ — inject from outside
class DatabaseService {
  constructor(private readonly logger: ILogger) {}
  // test:       new DatabaseService(mockLogger)
  // production: new DatabaseService(realLogger)
}

// Test — no real MongoDB needed
const mockLogger: ILogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};
const db = new DatabaseService(mockConfig, mockLogger);
```

**Before/after — static class migration:**

```typescript
// ❌ BEFORE — static methods import globals; can't mock them
export class AuditLogService {
  static init() {
    const db = database.getDb();    // module-level import
    logger.info("Initializing..."); // module-level import
  }
}
AuditLogService.init(); // no way to inject mocks

// ✅ AFTER — constructor injection
export class AuditLogService {
  constructor(
    private readonly database: IDatabase,
    private readonly logger: ILogger,
  ) {}

  init(): void {
    const db = this.database.getDb();
    this.logger.info("Initializing...");
  }
}

// main.ts
const auditLogService = new AuditLogService(database, logger);
auditLogService.init();

// test
const mockDb: IDatabase = { getDb: () => mockDatabase, ... };
const mockLogger: ILogger = { info: vi.fn(), ... };
const service = new AuditLogService(mockDb, mockLogger);
```

### Interface Segregation

Services depend on a small interface, not on `LogService` itself. When `LogService` grows, services that don't use the new method are unaffected.

```typescript
// LogService gains debug() — ILogger doesn't
class LogService implements ILogger {
  info(...) {}
  error(...) {}
  warn(...) {}
  debug(msg: string) {} // new — ILogger doesn't have this
}

// DatabaseService depends on ILogger → doesn't know about debug() → unaffected ✅
// If it depended on LogService directly → every LogService change would require review ❌
```

Adding `debug?` to `ILogger` later is backwards-compatible:

```typescript
export interface ILogger {
  info(message: string, ...args: unknown[]): void;
  error(data: unknown, message: string): void;
  warn(message: string, ...args: unknown[]): void;
  debug?(message: string, ...args: unknown[]): void; // optional — existing impls still work
}

// Old loggers still compile fine (debug is optional)
class SimpleLogger implements ILogger {
  info() {}
  error() {}
  warn() {}
}

// New services can use it with optional chaining
class BackupService {
  constructor(private logger: ILogger) {}

  runBackup() {
    this.logger.debug?.("Starting backup...");
  }
}
```

### Composition Root (`main.ts`)

All service construction and wiring happens in one file. The order is fixed:

```
1. Config      — no dependencies (Zod env validation)
2. Logger      — depends on Config
3. Database    — depends on Config + Logger
4. Cache       — depends on Config + Logger
5. AuditLog, Webhook, Backup — depend on Database + Logger
6. Plugins     — depend on app.db / app.cache / app.logger / app.config
```

```typescript
// templates/api/src/main.ts — the only place that constructs services
app.decorate("db", database);
app.decorate("cache", cache);
app.decorate("config", config);
app.decorate("logger", logger);

await database.connect(config, logger);
await cache.connect();

const auditLogService = new AuditLogService(database, logger);
auditLogService.init();

const webhookService = new WebhookService(database, logger);
webhookService.init();

const backupService = new BackupService(database, logger, config);
backupService.init();

await pluginLoader.loadAll(app); // plugins get everything via app.*
```

### Observer Pattern — `HookManager`

Plugins never import each other. `plugin-blog` emits; anyone listening reacts.

```typescript
// plugin-blog — doesn't know or care who's listening
await blogCol.insertOne(newPost);
hooks.emit("blog.created", newPost, request.user, request.ip);

// AuditLogService — subscribed in main.ts, not in plugin-blog
hooks.on("blog.created", async (post, user, ip) => {
  /* log it */
});

// WebhookService — same
hooks.on("blog.created", async (post, user, ip) => {
  /* fire webhooks */
});

// plugin-email (future) — just add a listener; plugin-blog never changes
```

Listener errors are isolated — one failing listener doesn't stop the others. Priority is supported:

```typescript
hooks.on("blog.created", auditLog, 10); // runs first
hooks.on("blog.created", sendWebhook, 20); // runs second

hooks.on("blog.created", () => {
  throw new Error("boom"); // doesn't stop the other listeners
});
```

Removing a plugin never breaks another plugin's imports — because there are no cross-plugin imports.

### Strategy Pattern — Frontend Data Fetching

The active data-fetching library is a one-line swap. Pages never see the difference.

```typescript
// admin/src/hooks/useApi.ts — one line picks the active adapter
export { useApiQuery, useApiMutation } from "./adapters/swr"; // active
// export { useApiQuery, useApiMutation } from "./adapters/tanstack"; // swap

// Every page always imports from here — never from the adapter directly
import { useApiQuery } from "@/hooks/useApi";
const { data, isLoading } = useApiQuery<Post[]>("/blog");
```

---

## 4. API Layer

### Repository Pattern

Route handlers stay thin. DB queries live in a repository class injected via `IDatabase`.

```typescript
// plugins/plugin-blog/api/BlogRepository.ts
export class BlogRepository {
  constructor(private readonly db: IDatabase) {}

  findPublished() {
    return this.db
      .getCollection<BlogPost>("cms_blog_posts")
      .find({ status: "published" })
      .toArray();
  }

  async create(post: NewBlogPost) {
    return this.db.getCollection<BlogPost>("cms_blog_posts").insertOne(post);
  }

  async updateById(id: string, update: Partial<BlogPost>) {
    return this.db
      .getCollection<BlogPost>("cms_blog_posts")
      .updateOne({ _id: new ObjectId(id) }, { $set: update });
  }
}

// Route handler — doesn't know how the query works
fastify.get("/blog", async () => blogRepository.findPublished());
```

Benefits: route handlers are readable; collection names are in one place; the repository can be tested with a mock `IDatabase`.

### Centralized Error Handling

All plugins throw; one handler in `main.ts` catches everything.

```typescript
// packages/core/src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404);
  }
}
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}
```

```typescript
// templates/api/src/main.ts
app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      status: "error",
      message: "Validation Error",
      details: error.issues.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
  }

  const statusCode = (error as AppError).statusCode;
  if (statusCode) {
    return reply.status(statusCode).send({ status: "error", message: error.message });
  }

  logger.error(error, `💥 Unhandled error on ${request.method} ${request.url}`);
  reply.status(500).send({ status: "error", message: "Internal Server Error" });
});
```

Route handlers become one-liners:

```typescript
// Instead of: if (!post) return reply.status(404).send(...)
const post = await blogPostsRepo.findById(id);
if (!post) throw new NotFoundError("Blog post");
```

### Draft Visibility Security

Unauthenticated requests always get `{ status: "published" }`, regardless of query params. Drafts are never exposed — even their existence is hidden (404, not 403).

```typescript
fastify.get("/blog", async (request: FastifyRequest) => {
  const { status } = request.query as BlogListQuery;
  const canReadDraft = !!request.user?.permissions?.includes("blog:read:draft");

  let filter: { status?: "draft" | "published" } = { status: "published" };

  if (canReadDraft) {
    if (status === "draft" || status === "published") {
      filter = { status };
    } else {
      filter = {}; // authorized users with no filter see everything
    }
  }

  const posts = await blogPostsRepo.find(filter);
  return { status: "success", posts: serializeDocuments(posts) };
});

fastify.get("/blog/:idOrSlug", async (request: FastifyRequest) => {
  const { idOrSlug } = request.params as { idOrSlug: string };
  const post = await blogPostsRepo.findByIdOrSlug(idOrSlug);

  if (!post) throw new NotFoundError("Blog post");

  // 404 instead of 403 — don't reveal the post exists
  if (post.status === "draft" && !request.user?.permissions?.includes("blog:read:draft")) {
    throw new NotFoundError("Blog post");
  }

  return { status: "success", post: serializeDocument(post) };
});
```

### Route Validation

Use Fastify's schema-based Zod validation. Errors are caught by the centralized handler above and reflected in Swagger automatically.

---

## 5. Admin Layer

### Plugin Page Registration

Each plugin admin page is re-exported from the Next.js app shell and resolved via `tsconfig.json` path mapping. Both steps are required when adding a new plugin. The planned CLI tool will automate this.

```typescript
// templates/admin/src/app/(dashboard)/blog/page.tsx
export { default } from "@cms/plugin-blog-admin/pages/BlogPage";
export { metadata } from "@cms/plugin-blog-admin/pages/BlogPage";
```

```json
// templates/admin/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@cms/plugin-blog-admin/*": ["../../plugins/plugin-blog/admin/*"],
      "@cms/plugin-pages-admin/*": ["../../plugins/plugin-pages/admin/*"]
    }
  }
}
```

Forgetting either step causes a TypeScript error and the plugin page won't load.

### Client/Server Component Convention

All plugin admin pages are client components. Data fetching is via `useApiQuery` / `useApiMutation`. Server components are not used in plugin pages because the adapter hooks are client-only.

```typescript
// plugins/plugin-blog/admin/pages/BlogPage.tsx
"use client";

import { useApiQuery } from "@/hooks/useApi";

export default function BlogPage() {
  const { data, isLoading } = useApiQuery<Post[]>("/blog");
  // ...
}
```

---

## 6. Testing Strategy

Three layers, each with a different scope:

```
Unit (behavior)     — pure logic, minimal stubs
  HookManager       → no mocks at all
  ConfigService     → pure Zod validation
  DatabaseService   → only ILogger stub

Integration         — real infrastructure, isolated
  DatabaseService.connect() → real MongoDB
  RedisCacheService.set()   → real Redis

Functional / E2E    — full HTTP via Fastify inject()
  Login → create post → verify response
```

**Unit — no mocks for pure logic:**

```typescript
// packages/core/src/HookManager.test.ts
describe("HookManager", () => {
  it("calls listener on emit", async () => {
    const hooks = new HookManager();
    const cb = vi.fn();
    hooks.on("blog.created", cb);
    await hooks.emit("blog.created", { title: "Test" });
    expect(cb).toHaveBeenCalledWith({ title: "Test" });
  });

  it("respects priority order", async () => {
    const hooks = new HookManager();
    const order: number[] = [];
    hooks.on("ev", () => order.push(2), 20);
    hooks.on("ev", () => order.push(1), 10);
    await hooks.emit("ev");
    expect(order).toEqual([1, 2]);
  });

  it("isolates listener errors — does not throw", async () => {
    const hooks = new HookManager();
    hooks.on("ev", () => {
      throw new Error("boom");
    });
    await expect(hooks.emit("ev")).resolves.toBeUndefined();
  });
});
```

**Unit — minimal stub for I/O-dependent classes:**

```typescript
// packages/db/src/DatabaseService.test.ts
const mockLogger: ILogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe("DatabaseService", () => {
  it("throws if getCollection called before connect", () => {
    const db = new DatabaseService();
    expect(() => db.getCollection("posts")).toThrow("Database not connected");
  });
});
```

**Functional — black-box via Fastify inject:**

```typescript
it("GET /blog returns posts", async () => {
  const app = Fastify();
  app.decorate("db", {
    getCollection: () => ({
      find: () => ({ sort: () => ({ toArray: async () => [] }) }),
    }),
  });
  app.decorate("logger", { info: () => {}, error: () => {}, warn: () => {} });
  await app.register(blogPlugin);

  const res = await app.inject({ method: "GET", url: "/blog" });
  expect(res.statusCode).toBe(200);
});
```

---

## 7. CLI Tool Design

Planned for a future sprint. Spec is here so the implementation has a clear contract.

### `cms create <project-name>`

1. Copy `templates/api`, `templates/admin`, `templates/client` to a new directory
2. Interactive plugin selection (auth is mandatory, others are optional)
3. Substitute project name in `package.json`, `docker-compose.yml`, `.env`
4. Set `COMPOSE_PROJECT_NAME` automatically
5. Generate a fresh `JWT_SECRET` — never reuse across projects
6. Optionally run `git init`

### `cms add <plugin-name>`

1. Install the plugin package (npm or monorepo source, depending on mode)
2. Generate the admin re-export page
3. Add the `tsconfig.json` path mapping entry
4. Insert the plugin record into MongoDB (`isEnabled`, `priority`)

---

## 8. Quick Reference

### Pattern Map

| Location                               | Pattern                                       |
| -------------------------------------- | --------------------------------------------- |
| `templates/api/src/main.ts`            | Composition Root                              |
| `packages/core/src/HookManager.ts`     | Observer / Event Bus                          |
| `plugins/*/api/index.ts`               | Fastify Decorator DI (`app.db`, `app.logger`) |
| `packages/core/src/types/fastify.d.ts` | TypeScript Module Augmentation                |
| `admin/src/hooks/useApi.ts`            | Strategy Pattern (adapter swap)               |
| `packages/core/src/types/ILogger.ts`   | Interface Segregation                         |
| `plugins/*/api/*Repository.ts`         | Repository Pattern                            |
| `main.ts → setErrorHandler`            | Centralized Error Handling                    |

### Interface Inventory

| Interface   | File                                   | Implementation              | Used by                  |
| ----------- | -------------------------------------- | --------------------------- | ------------------------ |
| `ILogger`   | `packages/core/src/types/ILogger.ts`   | `LogService` (Pino)         | All services & plugins   |
| `IDatabase` | `packages/core/src/types/IDatabase.ts` | `DatabaseService` (MongoDB) | All services & plugins   |
| `ICache`    | `packages/core/src/types/ICache.ts`    | `RedisCacheService` (Redis) | Cache-dependent services |
| `CmsPlugin` | `packages/core/src/types/plugin.ts`    | Each plugin module          | `PluginLoader`           |
