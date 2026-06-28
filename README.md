# CMS Core

A modular, headless CMS framework built with **Fastify**, **Next.js**, and **MongoDB**. Features are implemented as independent, pluggable packages — enabling you to compose only what your project needs.

> **Status:** 🚧 Active Development | Core infrastructure and plugin system functional

---

## Project Status

### ✅ Completed

- [x] **Core Infrastructure**
  - [x] Fastify API server with TypeScript native support (Node.js 26)
  - [x] MongoDB database service with connection pooling
  - [x] Redis cache service with auto-reconnect
  - [x] MinIO S3-compatible storage
  - [x] Docker Compose development environment
  
- [x] **Core Services (`@cms/core`)**
  - [x] ConfigService - Zod-validated environment config
  - [x] LogService - Pino structured logging
  - [x] HookManager - WordPress-style event bus
  - [x] PluginLoader - Dynamic plugin loading with priority ordering
  - [x] RedisCacheService - Redis client wrapper
  - [x] AuditLogService - Audit trail tracking
  - [x] WebhookService - HTTP webhook dispatcher
  - [x] BackupService - Automated MongoDB backups to S3/MinIO

- [x] **Plugin System**
  - [x] Dynamic plugin loading from MongoDB
  - [x] Plugin enable/disable via Admin UI
  - [x] Plugin-to-plugin communication via hooks
  - [x] Dependency injection (Fastify decorators)
  - [x] Plugin load order enforcement (auth-first)

- [x] **Authentication Plugin (`@cms/plugin-auth`)**
  - [x] JWT-based authentication (cookie + bearer token)
  - [x] User management (CRUD)
  - [x] Role-based access control (RBAC)
  - [x] Permission system with route-level checks
  - [x] Admin UI pages for users and roles

- [x] **Content Plugins**
  - [x] Blog plugin - Posts with categories and tags
  - [x] Pages plugin - Block-based page builder
  - [x] Forms plugin - Form builder and submission tracking
  - [x] System plugin - Settings, webhooks, backup management

- [x] **Admin Template**
  - [x] Next.js 16 App Router setup
  - [x] Login and authentication flow
  - [x] Plugin management UI
  - [x] Plugin admin pages integration (re-export pattern)
  - [x] React Query for data fetching
  - [x] Tailwind CSS v4 styling

- [x] **Monorepo Setup**
  - [x] npm workspaces configuration
  - [x] Workspace dependency hoisting
  - [x] TypeScript path mapping for cross-package imports
  - [x] Shared ESLint and prettier configs

- [x] **Client Template**
  - [x] Dynamic page rendering from Pages plugin
  - [x] Blog post listing and detail pages
  - [x] Form submission from client
  - [x] SEO optimization (meta tags, sitemap, RSS)

- [x] **API Documentation**
  - [x] Swagger/OpenAPI spec generation
  - [x] Interactive API docs via Swagger UI
  - [x] Plugin API documentation

### 🚧 In Progress

- [ ] **Testing Infrastructure**
  - [ ] Unit tests for core services
  - [ ] Integration tests for plugins
  - [ ] E2E tests for critical flows
  - [ ] Test coverage reporting

- [ ] **Security Enhancements**
  - [x] Rate limiting per user/IP (Fastify rate-limit integrated)
  - [ ] CSRF protection
  - [ ] Content Security Policy (CSP)
  - [ ] Input sanitization audit
  - [x] Helmet.js security headers (Fastify helmet integrated)

- [ ] **Media Management Plugin**
  - [ ] File upload to MinIO/S3
  - [ ] Image optimization and resizing
  - [ ] Media library UI
  - [ ] Image selection modal for editors

- [ ] **Performance Optimization**
  - [ ] Redis caching strategy for API responses
  - [ ] Database query optimization
  - [ ] Admin UI code splitting
  - [ ] CDN integration for static assets

#### Medium Priority

- [ ] **Content Versioning**
  - [x] Track content history (cms_post_versions snapshot collections implemented)
  - [ ] Revert to previous versions
  - [ ] Diff visualization

- [ ] **Workflow & Publishing**
  - [x] Draft/Published status (Draft/published option supported)
  - [ ] Scheduled publishing
  - [ ] Content approval workflow

- [ ] **Search & Filtering**
  - [ ] Full-text search (MongoDB Atlas Search or Elasticsearch)
  - [ ] Advanced filtering in Admin UI
  - [ ] Content tagging and categorization

- [ ] **Email Plugin**
  - [ ] Email template management
  - [ ] Transactional email sending (via SMTP or SendGrid)
  - [ ] Email webhook handling

- [ ] **Analytics Plugin**
  - [ ] Page view tracking
  - [ ] Event tracking
  - [ ] Admin dashboard with metrics

#### Low Priority

- [ ] **CLI Tool (`@cms/cli`)**
  - [ ] `cms create` - Scaffold new project
  - [ ] `cms add <plugin>` - Install plugin from registry
  - [ ] `cms migrate` - Run database migrations
  - [ ] `cms backup` - Manual backup trigger

- [ ] **GraphQL API**
  - [ ] GraphQL schema generation from plugins
  - [ ] Apollo Server integration
  - [ ] GraphQL playground

- [ ] **Internationalization (i18n)**
  - [ ] Multi-language content support
  - [ ] Language switcher UI
  - [] Translation management

- [ ] **Webhooks Dashboard**
  - [ ] Webhook delivery logs
  - [ ] Retry failed webhooks
  - [ ] Webhook testing tool

---

## Architecture

```
cms-core/
├── packages/
│   ├── core/              @cms/core
│   │   └── src/
│   │       ├── ConfigService.ts     — Zod-validated env config
│   │       ├── LogService.ts        — Pino structured logging
│   │       ├── HookManager.ts       — WordPress-style event bus
│   │       ├── PluginLoader.ts      — Dynamic plugin loading
│   │       ├── RedisCacheService.ts — Redis client wrapper
│   │       ├── AuditLogService.ts   — Audit trail tracking
│   │       ├── WebhookService.ts    — HTTP webhook dispatcher
│   │       ├── BackupService.ts     — MongoDB → S3/MinIO backups
│   │       └── types/plugin.ts      — Plugin interface definitions
│   └── db/                @cms/db
│       └── src/
│           └── DatabaseService.ts   — MongoDB client with pooling
│
├── plugins/
│   ├── plugin-auth/
│   │   ├── api/           @cms/plugin-auth-api    — JWT auth, users, RBAC (Fastify)
│   │   └── admin/         @cms/plugin-auth-admin  — User & Role management UI (Next.js)
│   ├── plugin-blog/
│   │   ├── api/           @cms/plugin-blog-api    — Blog posts API
│   │   └── admin/         @cms/plugin-blog-admin  — Blog post editor UI
│   ├── plugin-pages/
│   │   ├── api/           @cms/plugin-pages-api   — Dynamic pages API
│   │   └── admin/         @cms/plugin-pages-admin — Block-based page builder UI
│   ├── plugin-forms/
│   │   ├── api/           @cms/plugin-forms-api   — Form builder & submissions API
│   │   └── admin/         @cms/plugin-forms-admin — Form builder UI
│   └── plugin-system/
│       └── api/           @cms/plugin-system-api  — Settings, webhooks, backups API
│
├── templates/
│   ├── api/               Fastify REST API server
│   │   ├── src/
│   │   │   ├── main.ts              — Server entry point
│   │   │   └── scripts/seed.ts      — Database seeding
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── admin/             Next.js admin dashboard
│   │   ├── src/
│   │   │   ├── app/                 — Next.js App Router pages
│   │   │   ├── components/          — Reusable UI components
│   │   │   └── hooks/               — Custom React hooks
│   │   ├── Dockerfile
│   │   └── package.json
│   └── client/            Next.js public site
│       ├── src/
│       │   └── app/                 — Dynamic pages, blog, forms
│       ├── Dockerfile
│       └── package.json
│
├── cli/                   (planned) — Scaffolding CLI tool
├── docker-compose.yml     — Production services
├── docker-compose.override.yml — Development hot-reload
└── package.json           — npm workspaces root
```

**Key Concepts:**
- **Packages:** Shared core logic reused across templates and plugins
- **Plugins:** Self-contained feature modules with API routes + admin UI
- **Templates:** Runnable applications that compose packages & plugins
- **Monorepo:** npm workspaces with dependency hoisting for efficiency

---

## How It Works

### Plugin System

Plugins are toggled from the Admin UI and stored in MongoDB (`cms_plugins` collection). On server start, `PluginLoader` reads enabled plugins and dynamically imports them:

```typescript
// Each plugin exports:
export const name = "@cms/plugin-blog-api";
export const version = "1.0.0";
export async function register(fastify: FastifyInstance) { /* routes */ }
export default { name, version, register: fp(register, { name }) };
```

In **development**, plugins are resolved from the local `plugins/` source tree (no build step needed).  
In **production**, plugins are installed as npm packages from GitHub Packages (`@kaan35`).

### Hook System

Core services and plugins communicate via `HookManager` — a WordPress-style action/filter event bus:

```typescript
import { hooks } from "@cms/core";

// Emit from a plugin route handler
await hooks.emit("blog.created", post, user, request.ip);

// AuditLogService and WebhookService listen automatically
hooks.on("blog.created", async (post, user, ip) => { /* ... */ });
```

### Dependency Injection

Core services are decorated onto the Fastify instance so plugins can access them without direct imports:

```typescript
// In templates/api/src/main.ts
app.decorate("db", database);    // → fastify.db
app.decorate("cache", cache);    // → fastify.cache
app.decorate("config", config);  // → fastify.config
app.decorate("logger", logger);  // → fastify.logger
```

---

## Package Scopes

Packages use `@cms/` scope internally. On publish to GitHub Packages, the scope is remapped via `publishConfig.name` in each `package.json`:

| Internal (`@cms/`) | Published (`@kaan35/`) |
|---|---|
| `@cms/core` | `@kaan35/cms-core` |
| `@cms/db` | `@kaan35/cms-db` |
| `@cms/plugin-auth-api` | `@kaan35/cms-plugin-auth-api` |
| `@cms/plugin-blog-api` | `@kaan35/cms-plugin-blog-api` |
| `@cms/plugin-pages-api` | `@kaan35/cms-plugin-pages-api` |
| `@cms/plugin-forms-api` | `@kaan35/cms-plugin-forms-api` |
| `@cms/plugin-system-api` | `@kaan35/cms-plugin-system-api` |

---

## Getting Started

### Prerequisites

- Node.js ≥ 22
- MongoDB, Redis, MinIO (or use Docker)

### Local Development

```bash
# 1. Install all workspace dependencies (npm workspaces hoisting)
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB, Redis, and MinIO credentials

# 3. Start infrastructure services
docker compose up mongo redis minio -d

# 4. Start the API server (port 3001)
npm run dev:api

# 5. Start the admin panel (port 3002)
npm run dev:admin

# 6. Start the public site (port 3003)
npm run dev:client

# 7. (Optional) Seed the database with initial plugins
npm run seed --workspace=templates/api
```

### Docker (all services)

```bash
# Production
docker compose up -d --build

# Development (with hot-reload)
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

---

## Creating a New Project

### Option 1: Using This Monorepo (Development)

**Use Case:** Contributing to the framework or building custom plugins

```bash
# 1. Clone the repository
git clone https://github.com/kaan35/cms-core.git
cd cms-core

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Start all services with Docker
docker compose up -d --build

# 5. Access the applications
# Admin: http://localhost:3002
# API: http://localhost:3001
# Client: http://localhost:3003

# 6. (Optional) Seed database
npm run seed --workspace=templates/api
```

### Option 2: Standalone Project (Production)

**Use Case:** Building a new site with CMS Core (CLI not yet available)

**Manual Steps:**

1. **Copy template files:**
   ```bash
   mkdir my-cms-project
   cd my-cms-project
   
   # Copy core packages
   cp -r /path/to/cms-core/packages ./
   
   # Copy desired template
   cp -r /path/to/cms-core/templates/api ./api
   cp -r /path/to/cms-core/templates/admin ./admin
   cp -r /path/to/cms-core/templates/client ./client
   
   # Copy desired plugins
   mkdir plugins
   cp -r /path/to/cms-core/plugins/plugin-auth ./plugins/
   cp -r /path/to/cms-core/plugins/plugin-blog ./plugins/
   ```

2. **Create workspace root:**
   ```bash
   # Create package.json
   cat > package.json <<EOF
   {
     "name": "my-cms-project",
     "private": true,
     "workspaces": [
       "packages/*",
       "plugins/*/api",
       "plugins/*/admin",
       "api",
       "admin",
       "client"
     ]
   }
   EOF
   ```

3. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env
   ```

4. **Install and run:**
   ```bash
   npm install
   docker compose up -d
   ```

### Option 3: Using CLI (Planned)

```bash
# Scaffold new project
npx @kaan35/cms-cli create my-blog

# Add plugins
cd my-blog
cms add plugin-blog
cms add plugin-auth
cms add plugin-forms

# Start development
npm install
npm run dev:api
npm run dev:admin
```

**CLI will:**
- Copy selected templates and plugins
- Generate `package.json` with correct workspace config
- Create `.env` from template
- Initialize Git repository
- Optionally deploy to production (Vercel, Railway, etc.)

---

## Tech Stack & Services

### Infrastructure

| Service | Container | Port(s) | Purpose |
|---|---|---|---|
| **MongoDB** | `cms_mongo` | 27017 | Primary database for CMS content, users, plugins, audit logs |
| **Redis** | `cms_redis` | 6379 | Session cache, rate limiting, temporary data storage |
| **MinIO** | `cms_minio` | 9000 (API), 9001 (Console) | S3-compatible object storage for media uploads & backups |
| **API** | `cms_api` | 3001 | Fastify REST API — plugin routes, auth, webhooks |
| **Admin** | `cms_admin` | 3002 | Next.js admin dashboard — content management interface |
| **Client** | `cms_client` | 3003 | Next.js public site — renders dynamic pages, blog, forms |

### Technology Stack

| Layer | Technology |
|---|---|
| API | [Fastify](https://fastify.dev) v5 + TypeScript (native `--strip-types`, no build in dev) |
| Admin | [Next.js](https://nextjs.org) App Router + React 19 |
| Public site | Next.js App Router |
| Database | MongoDB |
| Cache | Redis |
| Validation | [Zod](https://zod.dev) |
| Storage | AWS S3 / MinIO |
| Auth | JWT (cookie-based, `jsonwebtoken`) |
| Package registry | GitHub Packages (`@kaan35`) |
| Monorepo | npm workspaces |
| Runtime | Node.js 26 (native TypeScript support) |

---

## Development Notes

### Workspace Dependency Management

This project uses **npm workspaces** with **dependency hoisting** to share dependencies across packages:

```json
{
  "workspaces": [
    "packages/*",
    "plugins/*/api",
    "plugins/*/admin",
    "templates/*"
  ]
}
```

**Key Points:**
- All dependencies are hoisted to root `node_modules`
- Plugin admin pages use `peerDependencies` to reference admin template's dependencies
- `NODE_PATH=/app/node_modules` set in Docker containers for proper module resolution

### Plugin Admin Pages Integration

Plugin admin pages are integrated using a **re-export pattern**:

```typescript
// templates/admin/src/app/(dashboard)/pages/page.tsx
export { default } from "@cms/plugin-pages-admin/pages/pages/page";
```

**TypeScript Path Mapping:**
```json
{
  "paths": {
    "@cms/plugin-auth-admin/*": ["../../plugins/plugin-auth/admin/*"],
    "@cms/plugin-blog-admin/*": ["../../plugins/plugin-blog/admin/*"]
  }
}
```

### Node.js 26 Native TypeScript

API server uses Node.js 26's `--experimental-strip-types` flag to run TypeScript directly without build step:

```bash
node --watch --experimental-strip-types --env-file=../../.env src/main.ts
```

**Benefits:**
- No `tsx` or `ts-node` runtime overhead
- Faster development startup
- Native hot-reload with `--watch`

### Docker Development Environment

Development uses `docker-compose.override.yml` for hot-reload:

- **Volume mounts:** Source code synced for instant changes
- **node_modules exclusion:** Container node_modules preserved
- **NODE_PATH:** Set to `/app/node_modules` for workspace compatibility

```yaml
volumes:
  - ./packages:/app/packages
  - ./plugins:/app/plugins
  - ./templates/api/src:/app/templates/api/src
```

---

## Troubleshooting

### Module Not Found Errors in Admin

**Problem:** `Error: Cannot find module 'lucide-react'` or similar

**Cause:** Workspace hoisting not working, Node.js can't resolve modules from root `node_modules`

**Solution:**
1. Ensure `NODE_PATH=/app/node_modules` is set in Dockerfile
2. Rebuild containers: `docker compose up -d --build`
3. Check package is in root: `docker exec cms_admin ls /app/node_modules | grep <package>`

### Plugin Load Order Issues

**Problem:** `checkPermission is not a function` errors

**Cause:** Plugin dependencies loaded in wrong order

**Solution:** `@cms/plugin-auth-api` must load first (provides authentication/authorization). The `PluginLoader` automatically sorts plugins to load `auth` first.

### React Compiler Errors

**Problem:** `Failed to load babel-plugin-react-compiler`

**Cause:** Next.js can't find the package with workspace hoisting

**Solution:**
1. Add `babel-plugin-react-compiler` to root `package.json` devDependencies
2. Set `NODE_PATH=/app/node_modules` in admin Dockerfile
3. Or disable React Compiler: `reactCompiler: false` in `next.config.ts`

### TypeScript Path Resolution in Plugins

**Problem:** Admin can't import from plugin admin packages

**Cause:** Missing TypeScript path mappings

**Solution:** Add paths to `templates/admin/tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@cms/plugin-*-admin/*": ["../../plugins/plugin-*/admin/*"]
    }
  }
}
```

### Container Keeps Restarting

**Problem:** Container exits immediately or restarts in loop

**Cause:** Usually missing environment variables or dependency errors

**Solution:**
1. Check logs: `docker logs cms_<service>`
2. Verify `.env` file exists and is mounted
3. Check for missing dependencies: `docker exec <container> npm list`

---

## Development Workflow

### Git Strategy

This project uses **Git Flow** with feature branches:

```
main (production-ready)
  └── develop (integration branch)
       ├── feature/client-template
       ├── feature/media-plugin
       ├── feature/api-docs
       └── bugfix/blog-description-truncate
```

**Branch Naming:**
- `feature/<feature-name>` - New features
- `bugfix/<bug-name>` - Bug fixes
- `hotfix/<critical-fix>` - Critical production fixes
- `refactor/<refactor-name>` - Code refactoring
- `docs/<doc-update>` - Documentation updates

**Commit Convention:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons, etc
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(blog): add description truncate to list view
fix(auth): resolve checkPermission loading order
docs(readme): add git workflow section
refactor(plugins): extract common table component
```

### Development Process

1. **Create feature branch:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/media-plugin
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "feat(media): add file upload to MinIO"
   ```

3. **Push and create PR:**
   ```bash
   git push origin feature/media-plugin
   # Create Pull Request to develop on GitHub
   ```

4. **After review, merge to develop:**
   ```bash
   git checkout develop
   git merge feature/media-plugin
   git push origin develop
   ```

5. **When develop is stable, merge to main:**
   ```bash
   git checkout main
   git merge develop
   git tag v1.0.0
   git push origin main --tags
   ```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Code Style:** Follow existing ESLint and Prettier configs
2. **Commits:** Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
3. **Testing:** Add tests for new features
4. **Documentation:** Update README and inline code comments

---

## License

MIT
