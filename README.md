# CMS Core — Modular Headless CMS & Application Platform

[![CI Pipeline](https://github.com/kaan35/cms-core/actions/workflows/ci.yml/badge.svg)](https://github.com/kaan35/cms-core/actions/workflows/ci.yml)
[![CodeQL](https://github.com/kaan35/cms-core/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/kaan35/cms-core/actions/workflows/github-code-scanning/codeql)
[![Dependabot Updates](https://github.com/kaan35/cms-core/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/kaan35/cms-core/actions/workflows/dependabot/dependabot-updates)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D26.0.0-339933?style=flat&logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=flat&logo=fastify)](https://fastify.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=next.js)](https://nextjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com)
[![Zod](https://img.shields.io/badge/Zod-4-3E67B1?style=flat&logo=zod)](https://zod.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-Passing-success?style=flat&logo=node.js)](#-testing--commands)

A modular, plugin-based headless CMS and application starter built with **Fastify 5**, **Next.js 16 (React 19)**, **MongoDB 8**, and **Redis 8**. You can run it as a full website with a public frontend or as a lightweight admin panel with only the plugins you need.

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🧩 Plugins](#-plugins)
- [📸 Screenshots & Showcase](#-screenshots--showcase)
- [🛠️ Getting Started](#️-getting-started)
  - [1. Run Locally](#1-run-the-monorepo-locally)
  - [2. CLI Scaffolding (`cms new`)](#2-create-and-upgrade-projects-cms-new--cms-upgrade)
  - [3. Selecting Plugins (`PLUGINS`)](#3-selecting-plugins-plugins)
  - [4. Docker Setup (Dev vs Prod)](#4-docker-architecture-development-vs-production)
- [🏗️ Architecture & Monorepo Structure](#️-architecture--monorepo-structure)
- [🧱 Web Client Blocks](#-web-client-blocks)
- [🤖 AI Agent Integration (MCP)](#-ai-agent-integration-mcp)
- [🛡️ Security](#️-security)
- [🧪 Testing & Commands](#-testing--commands)

---

## ✨ Features

- 🧩 **Modular Plugins**: Enable only the features each project needs (`pages`, `blog`, `forms`, `vault`, etc.).
- 🤖 **AI Assistant Ready (MCP)**: Manage drafts, pages, and SEO from AI coding tools via scoped tokens.
- 🛡️ **Security by Default**: Built-in RBAC, CSRF protection, encrypted secrets, and hardened containers.
- 📊 **Audit Logs**: Filterable activity history across users and AI agents (`success`, `access_denied`, `error`).
- 📁 **Native Excel & CSV Export**: Zero-dependency `.xlsx` and CSV generation using Node's built-in `zlib`.
- 🐳 **Dev & Prod Docker Stacks**: Hot-reload local containers and slim (~180 MB) standalone production images.

---

## 🧩 Plugins

| Plugin              | What it does                                                      |
| :------------------ | :---------------------------------------------------------------- |
| **`plugin-auth`**   | Authentication, roles, sessions, and scoped API/Agent tokens      |
| **`plugin-system`** | Audit logs, runtime plugin management, and brand settings         |
| **`plugin-mcp`**    | Remote HTTP MCP server and tools for AI coding assistants         |
| **`plugin-pages`**  | Block-based page builder, version history, and redirects          |
| **`plugin-blog`**   | Blog posts, categories, tags, and SEO fields                      |
| **`plugin-forms`**  | Form builder, built-in captcha, and submissions with Excel export |
| **`plugin-media`**  | Image uploads with MIME verification and S3/MinIO storage         |
| **`plugin-vault`**  | Encrypted password and secret manager                             |

---

## 📸 Screenshots & Showcase

### 🛡️ Admin Control Panel (`Next.js 16` + `React 19` + `Tailwind CSS 4`)

|                                                Dashboard                                                 |                                              Plugin Manager                                               |
| :------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------: |
| ![Admin Dashboard](docs/images/dashboard-preview.png)<br><sub>System overview and activity metrics</sub> | ![Plugin Manager](docs/images/plugins-preview.png)<br><sub>Runtime plugin toggles and system status</sub> |

|                                           Page Builder                                            |                                                   Form Builder                                                   |
| :-----------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------: |
| ![Page Builder](docs/images/pages-preview.png)<br><sub>Visual block editor and page layouts</sub> | ![Form Builder](docs/images/forms-preview.png)<br><sub>Form schema designer, submissions, and Excel export</sub> |

|                                                   Blog Posts                                                    |                                               Article Editor                                               |
| :-------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------: |
| ![Blog Posts Manager](docs/images/blog-posts-preview.png)<br><sub>Article listings and publication status</sub> | ![Blog Article Editor](docs/images/blog-editor-preview.png)<br><sub>Markdown editor and SEO metadata</sub> |

|                                           Password Vault                                            |                                                 Secret Details                                                 |
| :-------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------: |
| ![Password Vault](docs/images/vault-preview.png)<br><sub>Encrypted secrets manager and search</sub> | ![Vault Secret Modal](docs/images/vault-modal-preview.png)<br><sub>Password generator and secret details</sub> |

|                                          Media Library                                           |                                            Brand Settings                                            |
| :----------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------: |
| ![Media Library](docs/images/media-preview.png)<br><sub>Asset uploads and media management</sub> | ![Brand Settings](docs/images/branding-preview.png)<br><sub>Theme colors, typography, and logo</sub> |

|                                              API & Agent Tokens                                               |                                                 1-Click AI Agent Setup                                                  |
| :-----------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------: |
| ![API & Agent Tokens](docs/images/mcp-tokens-preview.png)<br><sub>Scoped access keys & agent management</sub> | ![Agent Setup Modal](docs/images/mcp-token-modal-preview.png)<br><sub>1-click setup for Antigravity, Cursor, etc.</sub> |

### 🌐 Public Web Client (`client-template`)

|                                                 Homepage (Dark)                                                 |                                                    Homepage (Light)                                                     |
| :-------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------: |
| ![Client Homepage Dark](docs/images/client-home-preview.png)<br><sub>Homepage with Bento grid (Dark mode)</sub> | ![Client Homepage Light](docs/images/client-home-light-preview.png)<br><sub>Homepage with Bento grid (Light mode)</sub> |

|                                                Contact Page (Dark)                                                 |                                                    Contact Page (Light)                                                    |
| :----------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------: |
| ![Client Contact Dark](docs/images/client-contact-preview.png)<br><sub>Contact form with captcha (Dark mode)</sub> | ![Client Contact Light](docs/images/client-contact-light-preview.png)<br><sub>Contact form with captcha (Light mode)</sub> |

---

## 🛠️ Getting Started

### 1. Run the Monorepo Locally

**Prerequisites:**

- **Node.js:** `>= 26.0.0`
- **Docker & Docker Compose**
- **npm:** `>= 10.0`

```bash
# 1. Clone the repository
git clone https://github.com/kaan35/cms-core.git
cd cms-core

# 2. Copy the environment configuration
cp .env.example .env

# 3. Start all services (MongoDB, Redis, MinIO, Fastify API, Admin Panel, Public Web Client)
npm run dev
```

| Service               | URL                                                          | Description                                                  |
| :-------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **REST API & Health** | [http://localhost:3001/health](http://localhost:3001/health) | Fastify 5 backend API and health check                       |
| **Swagger UI**        | [http://localhost:3001/docs](http://localhost:3001/docs)     | Interactive OpenAPI documentation generated from Zod schemas |
| **Admin Panel**       | [http://localhost:3002](http://localhost:3002)               | Manage content, plugins, users, and system settings          |
| **Setup Wizard**      | [http://localhost:3002/setup](http://localhost:3002/setup)   | Creates the initial admin account, then locks permanently    |
| **Public Web Client** | [http://localhost:3003](http://localhost:3003)               | Sample Next.js 16 public website powered by the block engine |

---

### 2. Create and Upgrade Projects (`cms new` & `cms upgrade`)

The CLI (`cli/bin/cms.js`) creates lightweight project folders (`.env`, `docker-compose.yml`, `package.json`, and an optional `client/` app) without copying `api/` or `admin/` source code. Projects are created in `./projects/<name>` by default (use `--dir` to change the target path) and automatically pick free ports if defaults are in use:

```bash
# Admin panel with Password Vault (no port flags → auto-picks free ports)
node cli/bin/cms.js new my-vault --plugins=vault --no-client --yes

# Full website with Pages, Blog, Forms, Media, and Next.js client/
node cli/bin/cms.js new my-site --plugins=pages,blog,forms,media --client --yes

# Explicit ports: manually pin fixed port numbers (or pass --dir=.. for another path)
node cli/bin/cms.js new custom-app --api-port=3101 --admin-port=3102 --mongo-port=27018 --redis-port=6380 --yes

# Interactive wizard
node cli/bin/cms.js new --interactive

# Upgrade an existing project's container tag
node cli/bin/cms.js upgrade latest --dir=./projects/my-site
```

---

### 3. Selecting Plugins (`PLUGINS`)

You can choose which plugins run in each project through the `PLUGINS` variable in `.env` (or `--plugins` in the CLI):

| `PLUGINS`                | Loaded Plugins                                                      | Typical Use Case                                                   |
| :----------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------- |
| `full` _(default)_       | `auth`, `system`, `media`, `pages`, `blog`, `forms`, `vault`, `mcp` | All built-in plugins enabled                                       |
| `minimal`                | `auth`, `system`                                                    | Core authentication, users, roles, and system settings only        |
| `vault`                  | `auth`, `system`, `vault`                                           | Standalone admin panel with the encrypted password manager         |
| `pages,blog,forms,media` | `auth`, `system`, `pages`, `blog`, `forms`, `media`                 | Public website, blog, and contact forms without the password vault |

- **Core Plugins:** `auth` and `system` are always enabled in every project.
- **Automatic Sidebar Filtering:** Plugins omitted from `PLUGINS` are automatically marked `enabled: false` in the database so they do not appear in the Admin sidebar.
- **Runtime Toggles:** Installed plugins can also be turned on or off anytime from the Admin UI at `/dashboard/plugins`.
- **Startup Validation:** If an unknown plugin name is passed in `PLUGINS`, the server stops on startup with a clear error message listing the valid plugin names.

---

### 4. Docker Architecture: Development vs. Production

Use `Dockerfile.dev` for live local development and multi-stage `Dockerfile` builds for production:

| Dimension      | Local Development (`Dockerfile.dev`)            | Production (`Dockerfile`)                     |
| :------------- | :---------------------------------------------- | :-------------------------------------------- |
| **Image Size** | ~2.8 GB (includes `devDependencies` and `tsx`)  | **~180 MB** (minimal standalone runtime)      |
| **Execution**  | Live volume bind-mounts (`.:/app`) & hot-reload | Compiled standalone builds (`dist/`, Next.js) |
| **Security**   | Development user                                | Non-root user (`USER node`)                   |

```bash
# Local development containers
npm run dev                 # Start all services with live reload
npm run logs                # Follow running container logs
npm run down                # Stop running containers

# Build production images (~180 MB each)
npm run docker:build        # Build API and Admin images
npm run docker:build:api    # Build API image only
npm run docker:build:admin  # Build Admin image only
```

**Remote Server (VPS) Deployment:**
No need to clone the repository on your server — copy only your project's `docker-compose.yml` and `.env`, then run `docker compose pull && docker compose up -d`.

---

## 🏗️ Architecture & Monorepo Structure

```text
cms-core/
├── packages/
│   ├── core/            ← Fastify 5 server, RedisCacheService, HookManager, PluginLoader, @cms/core/testing
│   ├── db/              ← MongoDB 8 adapter (DatabaseService) implementing IDatabase
│   ├── eslint-config/   ← Shared ESLint 10 rules for Node.js, React, and Next.js
│   ├── tsconfig/        ← Shared TypeScript 6 configuration
│   ├── admin-shell/     ← Shared React 19 UI components, dynamic Sidebar, form inputs
│   └── client-sdk/      ← Shared TypeScript types and API client for frontend apps
├── plugins/plugin-*     ← Modular 3-tier plugins (api, admin, client — listed in Plugins above)
├── api/                 ← Fastify 5 backend entrypoint (Dockerfile & Dockerfile.dev)
├── admin/               ← Next.js 16 Admin panel entrypoint (Dockerfile & Dockerfile.dev)
├── client-template/     ← Starter Next.js 16 public website template for --client projects
├── cli/                 ← Scaffolding and upgrade CLI (cms new, cms upgrade)
└── docker-compose.test.yml ← Isolated RAM-backed (tmpfs) MongoDB 8 & Redis 8 test containers
```

### Component Ownership

| Layer                                                                                      | Distributed As                                    | Maintenance                                                               |
| :----------------------------------------------------------------------------------------- | :------------------------------------------------ | :------------------------------------------------------------------------ |
| **Core Packages** (`core`, `db`, `admin-shell`, `client-sdk`, `tsconfig`, `eslint-config`) | Workspace packages                                | Centrally maintained in the monorepo                                      |
| **Built-in Plugins** (`plugin-*`)                                                          | Modular 3-tier plugins (`api`, `admin`, `client`) | Centrally maintained; enabled per project via `PLUGINS`                   |
| **Backend & Admin Runtimes** (`api/`, `admin/`)                                            | Docker images (`cms-api`, `cms-admin`)            | Pre-configured server and admin containers                                |
| **Public Website** (`client-template/`)                                                    | Starter Next.js 16 app                            | Copied into `--client` projects so you can customize your frontend design |

---

## 🧱 Web Client Blocks

Projects created with `--client` include a modular Next.js 16 frontend that renders pages built in the Admin panel:

| Block Type           | Component                  | Description                                                                      |
| :------------------- | :------------------------- | :------------------------------------------------------------------------------- |
| **Hero Block**       | `HeroBlock.tsx`            | Full-width or split hero banner with headline, badge, and call-to-action buttons |
| **Bento Grid**       | `BentoGridBlock.tsx`       | Responsive card grid with configurable desktop columns and icons                 |
| **Rich Text**        | `TextBlock.tsx`            | Formatted text block for articles and documentation pages                        |
| **Media Gallery**    | `GalleryBlock.tsx`         | Image gallery with lightbox preview                                              |
| **Blog Feed**        | `BlogPostsBlock.tsx`       | Displays recent published blog posts with tags and reading time                  |
| **Dynamic Form**     | `FormBlock.tsx`            | Renders Admin forms with validation and self-contained math/text captcha         |
| **Code Showcase**    | `CodeShowcaseBlock.tsx`    | Syntax-highlighted code block with a copy button                                 |
| **Interactive Demo** | `InteractiveDemoBlock.tsx` | Interactive client-side challenge and verification demo widget                   |

- **Brand Color Sync:** Theme colors and typography configured in the Admin panel apply automatically to the public website.

---

## 🤖 AI Agent Integration (MCP)

Built-in Model Context Protocol (MCP) server at `/api/mcp` over **Streamable HTTP** (plus an optional local `stdio` CLI) for connecting AI coding assistants and editors using scoped tokens.

### Available MCP Tools

| Tool Name              | Parameters                                        | Description                                                        |
| :--------------------- | :------------------------------------------------ | :----------------------------------------------------------------- |
| `get_system_status`    | _none_                                            | Returns API health and counts for pages, posts, forms, and plugins |
| `list_pages`           | `limit`, `offset`, `search`                       | Lists pages with metadata and block counts                         |
| `get_page`             | `slug`                                            | Returns full page details and block structure                      |
| `create_page_draft`    | `title`, `slug`, `blocks`                         | Creates a page draft for review in the Admin builder               |
| `list_blog_posts`      | `limit`, `status`, `search`                       | Lists posts filtered by status (`draft`, `published`) or keyword   |
| `get_blog_post`        | `slug`                                            | Returns a full blog post with Markdown body and reading time       |
| `create_blog_draft`    | `title`, `slug`, `body`, `tags`, `seoDescription` | Creates a draft article with automatic slug and excerpt generation |
| `suggest_seo_metadata` | `title`, `body`                                   | Suggests SEO titles, descriptions, and tags                        |
| `list_forms`           | _none_                                            | Lists forms and their field schemas                                |
| `get_form_submissions` | `formId`, `limit`                                 | Returns submissions for a form                                     |

> [!IMPORTANT]
> **Vault Isolation:** The Password Vault (`plugin-vault`) is **never exposed** to MCP. AI agents have zero access to stored passwords or secrets.

---

### Connecting AI Agents & IDEs

Generate ready-to-paste config snippets from `/dashboard/tokens`:

1. Open **Admin Panel** → **Settings** → **API & Agent Tokens** (`/dashboard/tokens`).
2. Click **Generate New Agent / API Token**, select an editor or agent preset, and create the key.
3. Paste the generated snippet into your tool's config file:

| Agent / Editor         | Config File                           | Transport & Auth                      |
| :--------------------- | :------------------------------------ | :------------------------------------ |
| **Google Antigravity** | `~/.gemini/config/mcp_config.json`    | Streamable HTTP (`url` + `Bearer`)    |
| **Cursor IDE**         | `.cursor/mcp.json`                    | Streamable HTTP (`url` + `Bearer`)    |
| **GitHub Copilot**     | `~/.copilot/mcp-config.json`          | Streamable HTTP (`url` + `Bearer`)    |
| **OpenAI Codex / GPT** | Custom GPT Action or API Header       | Streamable HTTP (`/api/mcp`) / Header |
| **Claude Desktop**     | `claude_desktop_config.json`          | Streamable HTTP (`url` + `Bearer`)    |
| **Windsurf**           | `~/.codeium/windsurf/mcp_config.json` | Streamable HTTP (`url` + `Bearer`)    |
| **cURL & Scripts**     | HTTP Request                          | `Authorization: Bearer cms_token_...` |

#### Streamable HTTP Config (Recommended)

```json
{
  "mcpServers": {
    "cms": {
      "type": "http",
      "url": "http://localhost:3001/api/mcp",
      "tools": ["*"],
      "headers": {
        "Authorization": "Bearer cms_token_xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

#### Local `stdio` Alternative (`plugins/plugin-mcp/api`)

```json
{
  "mcpServers": {
    "cms": {
      "command": "node",
      "args": ["<PROJECT_ROOT>/plugins/plugin-mcp/api/dist/cli.js"],
      "env": {
        "CMS_API_URL": "http://localhost:3001",
        "CMS_API_KEY": "cms_token_xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

---

## 🛡️ Security

- **Authentication & Sessions**
  - `bcrypt` password hashing (max 72-byte limit enforced) with dummy-hash checks against email enumeration.
  - `HttpOnly`, `SameSite` session cookies signed with `HS256` JWTs.
  - Instant session revocation (`POST /api/auth/sessions/revoke-all`) and account suspension (terminates sessions, clears cached API tokens, and blocks access with `403`).
  - First-run `/setup` wizard locks permanently after the first admin is created.

- **Access Control & API Protection**
  - Role-based permissions (`RBAC`) across all endpoints and scoped tokens (`pages:read`, `blog:write`) for agents.
  - Double-Submit CSRF protection on state-changing requests and Zod validation on all inputs.
  - Disabled plugins return `503 Service Unavailable`.

- **Secrets & Infrastructure**
  - Vault items are encrypted at rest with `AES-256-GCM` using `Argon2id`-derived keys.
  - Sensitive fields (`password`, `token`, `secret`) are redacted from logs.
  - Uploads are checked by binary magic bytes (PNG, JPEG, WebP); SVG/XML files are blocked to prevent XSS.
  - Production Docker containers run as non-root (`USER node`).

---

## 🧪 Testing & Commands

Tests run on Node's built-in test runner (`node:test`) without external mocking libraries:

- **In-Memory Tests (`npm test`)**: Runs unit, service, CLI, and Fastify `inject()` API route tests using the shared in-memory DB and cache (`@cms/core/testing`) — no Docker needed.
- **Docker Integration Tests (`npm run test:integration:once`)**: Runs real **MongoDB 8** (`27019`) and **Redis 8** (`6381`) tests in isolated RAM-backed (`tmpfs`) containers without touching your local dev database.
- **Contract Parity**: Shared contract tests (`databaseContract.ts`, `cacheContract.ts`) run against both the in-memory adapters and the real Docker containers so sorting, unique indexes (`409`), UTC dates, and cache TTLs behave identically.

```bash
npm test                       # Run in-memory unit, service, CLI, and API route tests
npm run test:integration:once  # Start isolated test containers, run integration tests, and clean up
npm run test:integration:run   # Keep test containers open for fast re-runs (stop with :down)
npm run ci                     # Build, typecheck, lint, and in-memory tests (ci:full adds integration)
npm run typecheck              # Parallel TypeScript check across all workspaces
npm run lint                   # Run ESLint across all workspaces
npm run build                  # Compile packages, API, and CLI to dist/
npm run db:backup              # Save timestamped MongoDB backup to backups/
npm run db:restore             # Restore MongoDB from backups/backup-latest.archive
```
