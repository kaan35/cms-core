# CMS Core

A modular, headless CMS built with **Fastify**, **Next.js**, and **MongoDB**. Every feature is a plugin: it ships its own API routes, admin pages, and permissions, and you can add or remove it without touching the rest of the codebase.

[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-black?logo=fastify)](https://fastify.dev)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb)](https://www.mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> **Status:** Work in progress. 🚧

## Why This Exists

Most personal CMS projects start out reusable, then by the second or third site you are copy-pasting code again. This project tries to avoid that: a small core (plugin loader, event bus, DB/cache access) is shared by every project, and features (blog, pages, forms, auth) live in separate plugins that a project includes or skips. Adding e-commerce to an existing blog should mean adding a `plugin-cart` folder, not rewriting the admin panel.

That has a real cost — building the plugin contract and the DI wiring up front took longer than a single-purpose CMS would have. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the reasoning behind the main decisions.

## Architecture

```
cms-core/
├── packages/
│   ├── core/              @cms/core
│   │   └── src/
│   │       ├── ConfigService.ts     — Zod-validated env config
│   │       ├── LogService.ts        — Pino structured logging
│   │       ├── HookManager.ts       — plugin event bus (WordPress-style)
│   │       ├── PluginLoader.ts      — dynamic plugin loading, DB-driven
│   │       ├── RedisCacheService.ts — cache client with auto-reconnect
│   │       ├── AuditLogService.ts   — audit trail
│   │       ├── WebhookService.ts    — outbound webhook dispatch
│   │       ├── BackupService.ts     — MongoDB → S3/MinIO backups
│   │       └── types/               — ILogger, IDatabase, ICache, CmsPlugin
│   └── db/                @cms/db
│       └── src/DatabaseService.ts   — MongoDB client, retry/backoff
│
├── plugins/
│   ├── plugin-auth/       api + admin — JWT auth, users, roles, permissions
│   ├── plugin-blog/       api + admin — posts, versioning, drafts
│   ├── plugin-pages/      api + admin — block-based page builder
│   ├── plugin-forms/      api + admin — form builder & submissions
│   └── plugin-system/     api        — settings, webhooks, backups
│
├── templates/
│   ├── api/                Fastify REST API server
│   ├── admin/               Next.js admin dashboard
│   └── client/               Next.js public site
│
├── docker-compose.yml            — dev (hot-reload, bind-mounted source)
├── docker-compose.prod.yml       — prod (self-contained, no bind mounts)
└── package.json                  — npm workspaces root
```

**Key concepts**

- **Packages** — shared code that every plugin and template depends on.
- **Plugins** — self-contained features: API routes + admin UI + permissions, loaded at runtime based on a DB flag.
- **Templates** — the apps you actually run (API, admin, client), which wire packages and plugins together.

## How It Works

### Plugins load at runtime, not at build time

Plugins are turned on and off from the admin UI, and that setting is stored in MongoDB. On boot, `PluginLoader` checks which plugins are enabled and loads them in order (auth always first):

```typescript
export const name = "@cms/plugin-blog-api";
export const version = "1.0.0";
export async function register(fastify: FastifyInstance) {
  /* routes, using fastify.db / fastify.logger — see below */
}
export default { name, version, register: fp(register, { name }) };
```

In development, plugins load straight from the local `plugins/` folder — no build step. In production they install as npm packages from GitHub Packages (`@kaan35/*`).

### Plugins talk through events, not imports

`HookManager` is a small pub/sub event bus. `plugin-blog` never imports `plugin-email` or `AuditLogService` — it just emits an event, and whatever is listening reacts:

```typescript
await hooks.emit("blog.created", post, request.user, request.ip);

// AuditLogService and WebhookService subscribe to this independently
hooks.on("blog.created", async (post, user, ip) => {
  /* ... */
});
```

Since plugins never import each other directly, removing one never breaks another.

### Services are wired once, injected everywhere

Core services get attached to the Fastify instance in one place (`main.ts`). Every plugin reads them off `fastify.*` instead of importing the concrete class:

```typescript
// main.ts — the only place that constructs services
app.decorate("db", database);
app.decorate("logger", logger);

// any plugin route — no import of DatabaseService or LogService
const posts = await fastify.db.getCollection("cms_blog_posts").find().toArray();
```

Services depend on small interfaces (`ILogger`, `IDatabase`, `ICache`) instead of each other's concrete classes. That means a plugin can be unit-tested by handing it a fake Fastify instance with a stub `db` — no real MongoDB connection needed. More on this in [`ARCHITECTURE.md §1`](./ARCHITECTURE.md#1-service-wiring--interfaces).

## Package Scopes

Packages use `@cms/` internally. On publish to GitHub Packages, the scope remaps via `publishConfig.name`:

| Internal (`@cms/`)       | Published (`@kaan35/`)          |
| ------------------------ | ------------------------------- |
| `@cms/core`              | `@kaan35/cms-core`              |
| `@cms/db`                | `@kaan35/cms-db`                |
| `@cms/plugin-auth-api`   | `@kaan35/cms-plugin-auth-api`   |
| `@cms/plugin-blog-api`   | `@kaan35/cms-plugin-blog-api`   |
| `@cms/plugin-pages-api`  | `@kaan35/cms-plugin-pages-api`  |
| `@cms/plugin-forms-api`  | `@kaan35/cms-plugin-forms-api`  |
| `@cms/plugin-system-api` | `@kaan35/cms-plugin-system-api` |

## Getting Started

**Prerequisites:** Node.js ≥ 26, Docker (for MongoDB/Redis/MinIO, or run them yourself).

```bash
npm install
cp .env.example .env               # fill in MongoDB / Redis / MinIO credentials

docker compose up mongo redis minio -d

npm run dev:api                    # http://localhost:3001  (docs at /docs)
npm run dev:admin                  # http://localhost:3002
npm run dev:client                 # http://localhost:3003

npm run seed --workspace=templates/api   # optional: sample content + plugin registration
```

Full stack via Docker:

```bash
# Dev (hot-reload, bind-mounted source)
docker compose up -d --build

# Prod (self-contained image, no bind mounts, infra requires auth)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Running more than one project from this repo on the same host? Set `COMPOSE_PROJECT_NAME` in `.env` (or `.env.production`) so container/network/volume names don't collide.

## Starting a New Project

**Contributing to the framework itself:** clone this repo, `npm install`, `docker compose up -d --build`. Standard monorepo workflow.

**Building a separate site on top of it:** there's no CLI yet, so for now it's a manual copy. Copy `packages/`, the templates you need, and the plugins you want into a new repo, write a root `package.json` with matching `workspaces`, and generate new `.env` secrets (`JWT_SECRET` especially — never reuse the same secret across projects). A CLI (`cms create`, `cms add <plugin>`) is planned to replace this step; see `TODO.md`.

## Tech Stack & Services

| Service     | Container    | Port(s)     | Purpose                                                  |
| ----------- | ------------ | ----------- | -------------------------------------------------------- |
| **MongoDB** | `cms_mongo`  | 27017       | Content, users, plugin registry, audit logs              |
| **Redis**   | `cms_redis`  | 6379        | Cache, rate limiting                                     |
| **MinIO**   | `cms_minio`  | 9000 / 9001 | S3-compatible storage for backups (media plugin pending) |
| **API**     | `cms_api`    | 3001        | Fastify — plugin routes, auth, webhooks                  |
| **Admin**   | `cms_admin`  | 3002        | Next.js — content management                             |
| **Client**  | `cms_client` | 3003        | Next.js — renders pages, blog, forms                     |

| Layer      | Technology                                                                        |
| ---------- | --------------------------------------------------------------------------------- |
| API        | Fastify v5 + TypeScript, native type stripping (Node.js 26, no build step in dev) |
| Admin      | Next.js App Router + React 19                                                     |
| Database   | MongoDB                                                                           |
| Cache      | Redis                                                                             |
| Validation | Zod                                                                               |
| Storage    | S3 / MinIO                                                                        |
| Auth       | JWT, cookie-based                                                                 |
| Monorepo   | npm workspaces                                                                    |

## License

MIT
