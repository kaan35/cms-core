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
[![Tests](https://img.shields.io/badge/Tests-258%20Passing-success?style=flat&logo=node.js)](#-testing--commands)

A modular, plugin-based headless CMS and application starter built with **Fastify 5**, **Next.js 16 (React 19)**, **MongoDB 8**, and **Redis 8**. You can run it as a full website with a public frontend or as a lightweight admin panel with only the plugins you need.

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🧩 Plugins](#-plugins)
- [📸 Screenshots & Showcase](#-screenshots--showcase)
- [🛠️ Getting Started](#️-getting-started)
  - [1. Run Locally](#1-run-the-monorepo-locally)
  - [2. CLI Scaffolding (`cms new`)](#2-create-and-upgrade-projects-cms-new--cms-upgrade)
  - [3. Selecting Plugins (`PLUGINS_PROFILE`)](#3-selecting-plugins-plugins_profile)
  - [4. Docker Setup (Dev vs Prod)](#4-docker-architecture-development-vs-production)
- [🏗️ Architecture & Monorepo Structure](#️-architecture--monorepo-structure)
- [🧱 Web Client Blocks](#-web-client-blocks)
- [🤖 AI Agent Integration (MCP)](#-ai-agent-integration-mcp)
- [🛡️ Security](#️-security)
- [🧪 Testing & Commands](#-testing--commands)

---

## ✨ Features

- 🧩 **Modular Plugins**: Turn features on or off (`pages`, `blog`, `forms`, `vault`, etc.) per project via `.env` or from the Admin UI.
- 🤖 **AI Assistant Ready (MCP)**: Built-in Model Context Protocol endpoint (`/api/mcp`) so tools like **Cursor**, **Antigravity**, or **Claude** can interact with your content safely using scoped tokens.
- 🛡️ **Built-in Security**: Includes bcrypt password hashing, CSRF protection, AES-256-GCM encryption for secrets, and non-root Docker images.
- 📊 **Audit Logs**: Records user and AI agent activity with status badges (`success`, `access_denied`, `error`) and filterable logs.
- 📁 **Native Excel & CSV Export**: Generates `.xlsx` and CSV files using Node's built-in `zlib` without bulky external dependencies.
- 🐳 **Docker Support**: Ready-to-use Docker Compose for local hot-reload development and minimal multi-stage production images.

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
| **Setup Wizard**      | [http://localhost:3002/setup](http://localhost:3002/setup)   | First-run screen to create the initial admin account         |
| **Public Web Client** | [http://localhost:3003](http://localhost:3003)               | Sample Next.js 16 public website powered by the block engine |

> [!TIP]
> **First-Time Setup:** When running for the first time, navigate to [http://localhost:3002/setup](http://localhost:3002/setup) to create the initial admin account. Once completed, the wizard automatically locks permanently for security.

---

### 2. Create and Upgrade Projects (`cms new` & `cms upgrade`)

The CLI tool (`cli/bin/cms.js`) scaffolds and upgrades lightweight project folders containing `.env`, `docker-compose.yml`, `package.json`, and an optional `client/` folder without copying `api/` or `admin/` source code:

```bash
# Private admin panel with Password Vault (no public website)
node cli/bin/cms.js new ../my-site --profile=vault --no-client --dir=.. --yes

# Full website with Pages, Blog, Forms, Media, and Next.js client/
node cli/bin/cms.js new ../my-site --profile=pages,blog,forms,media --client --dir=.. --yes

# Interactive setup prompt
node cli/bin/cms.js new --interactive

# Upgrade an existing project to a specific CMS container version
node cli/bin/cms.js upgrade latest --dir=../my-site
```

---

### 3. Selecting Plugins (`PLUGINS_PROFILE`)

You can choose which plugins run in each project through the `PLUGINS_PROFILE` variable in `.env`:

| `PLUGINS_PROFILE`        | Loaded Plugins                                                      | Typical Use Case                                                   |
| :----------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------- |
| `full` _(default)_       | `auth`, `system`, `media`, `pages`, `blog`, `forms`, `vault`, `mcp` | All built-in plugins enabled                                       |
| `minimal`                | `auth`, `system`                                                    | Core authentication, users, roles, and system settings only        |
| `vault`                  | `auth`, `system`, `vault`                                           | Private admin panel with the encrypted password manager            |
| `pages,blog,forms,media` | `auth`, `system`, `pages`, `blog`, `forms`, `media`                 | Public website, blog, and contact forms without the password vault |

- **Core Plugins:** `auth` and `system` are always enabled in every project.
- **Automatic Sidebar Filtering:** Plugins omitted from `PLUGINS_PROFILE` are automatically marked `enabled: false` in the database so they do not appear in the Admin sidebar.
- **Runtime Toggles:** Installed plugins can also be turned on or off anytime from the Admin UI at `/dashboard/plugins`.
- **Startup Validation:** If an unknown plugin name is passed in `PLUGINS_PROFILE`, the server stops on startup with a clear error message listing the valid plugin names.

---

### 4. Docker Architecture: Development vs. Production

The platform supports hot-reload development and ultra-slim multi-stage production builds:

| Dimension      | Local Development (`Dockerfile.dev`)                   | Production Deployment (`Dockerfile`)                                    |
| :------------- | :----------------------------------------------------- | :---------------------------------------------------------------------- |
| **Image Size** | ~2.8 GB (includes `devDependencies`, compilers, `tsx`) | **~180 MB** (zero dev tooling, minimal standalone runtime)              |
| **Execution**  | Live host volume bind-mounts (`.:/app`) & hot-reload   | Standalone compiled artifacts (`node dist/main.js`, Next.js standalone) |
| **Security**   | Development debugging user                             | **Enforced `USER node` (non-root)**, reduced CVE surface                |

```bash
# Development container workflow
npm run dev           # Start all services with live reload
npm run logs          # Follow real-time container logs
npm run down          # Stop all running containers

# Build lightweight production images (~180MB each)
npm run docker:build        # Build both API and Admin production images
npm run docker:build:api    # Build standalone Fastify API image
npm run docker:build:admin  # Build standalone Next.js 16 Admin image
```

**Remote Server (VPS) Deployment:**
To deploy on a remote server, you do not need to clone the repository or copy source code. Copy only your project's `docker-compose.yml` and `.env` file to the server, then run `docker compose pull && docker compose up -d`.

---

## 🏗️ Architecture & Monorepo Structure

```text
cms-core/
├── packages/
│   ├── core/            ← Fastify 5 server, HookManager event bus, PluginLoader, DI container
│   ├── db/              ← MongoDB 8 & Redis 8 adapters behind IDatabase and ICache interfaces
│   ├── tsconfig/        ← Shared TypeScript 6 configuration
│   ├── admin-shell/     ← Shared React 19 UI components, dynamic Sidebar, form inputs
│   └── client-sdk/      ← Shared TypeScript types and API client for frontend apps
├── plugins/
│   ├── plugin-auth/     ← Authentication, API/agent tokens, RBAC, sessions, CSRF protection
│   ├── plugin-system/   ← Audit logs, feature flags, brand settings, runtime plugin toggles
│   ├── plugin-mcp/      ← Remote Streamable HTTP MCP server & AI agent tools
│   ├── plugin-pages/    ← Block-based page builder, version history, 301 redirects
│   ├── plugin-blog/     ← Blog articles, slugs, reading time, SEO metadata
│   ├── plugin-media/    ← S3/MinIO file uploads and binary MIME verification
│   ├── plugin-forms/    ← Form builder, math/text captcha, submissions, Excel (.xlsx) & CSV export
│   └── plugin-vault/    ← AES-256-GCM encrypted password and secret manager
├── api/                 ← Fastify 5 backend entrypoint (Dockerfile & Dockerfile.dev)
├── admin/               ← Next.js 16 Admin panel entrypoint (Dockerfile & Dockerfile.dev)
├── client-template/     ← Starter Next.js 16 public website template for --client projects
└── cli/                 ← Scaffolding and upgrade CLI (cms new, cms upgrade)
```

### Component Ownership

| Layer                                                         | Distributed As                                    | Maintenance                                                               |
| :------------------------------------------------------------ | :------------------------------------------------ | :------------------------------------------------------------------------ |
| **Core Packages** (`core`, `db`, `admin-shell`, `client-sdk`) | Workspace packages                                | Centrally maintained in the monorepo                                      |
| **Built-in Plugins** (`plugin-*`)                             | Modular 3-tier plugins (`api`, `admin`, `client`) | Centrally maintained; enabled per project via `PLUGINS_PROFILE`           |
| **Backend & Admin Runtimes** (`api/`, `admin/`)               | Docker images (`cms-api`, `cms-admin`)            | Pre-configured server and admin containers                                |
| **Public Website** (`client-template/`)                       | Starter Next.js 16 app                            | Copied into `--client` projects so you can customize your frontend design |

---

## 🧱 Web Client Blocks

Projects created with `--client` include a modular Next.js 16 frontend that renders pages built in the Admin panel:

| Block Type        | Component               | Description                                                                      |
| :---------------- | :---------------------- | :------------------------------------------------------------------------------- |
| **Hero Block**    | `HeroBlock.tsx`         | Full-width or split hero banner with headline, badge, and call-to-action buttons |
| **Bento Grid**    | `BentoGridBlock.tsx`    | Responsive card grid with configurable desktop columns and icons                 |
| **Rich Text**     | `TextBlock.tsx`         | Formatted text block for articles and documentation pages                        |
| **Media Gallery** | `GalleryBlock.tsx`      | Image gallery with lightbox preview                                              |
| **Blog Feed**     | `BlogPostsBlock.tsx`    | Displays recent published blog posts with tags and reading time                  |
| **Dynamic Form**  | `FormBlock.tsx`         | Renders forms created in Admin with validation and captcha protection            |
| **Code Showcase** | `CodeShowcaseBlock.tsx` | Syntax-highlighted code block with a copy button                                 |

- **Brand Color Sync:** Theme colors and typography configured in the Admin panel apply automatically to the public website.
- **Built-in Captcha:** Public forms use a self-contained math and text challenge captcha without external tracking scripts.

---

## 🤖 AI Agent Integration (MCP)

The platform provides a native Model Context Protocol (MCP) endpoint (`/api/mcp`) supporting modern **Remote Streamable HTTP MCP** as the primary standard, enabling AI agents (such as **Google Antigravity**, **Claude Desktop**, **Cursor**, **Windsurf**, and **GitHub Copilot**) to safely interact with CMS content. An optional local `stdio` CLI transport (`plugins/plugin-mcp/api`) is also available for source-level local workflows.

### Available MCP Tools

| Tool Name              | Parameters                                        | Description                                                                   |
| :--------------------- | :------------------------------------------------ | :---------------------------------------------------------------------------- |
| `get_system_status`    | _none_                                            | Checks API health and returns platform metrics (pages, posts, forms, plugins) |
| `list_pages`           | `limit`, `offset`, `search`                       | Lists CMS pages with metadata and block counts                                |
| `get_page`             | `slug`                                            | Retrieves complete page details and visual block structures                   |
| `create_page_draft`    | `title`, `slug`, `blocks`                         | Creates a new page draft for human review in the Admin builder                |
| `list_blog_posts`      | `limit`, `status`, `search`                       | Lists articles filtered by publication status (`draft`, `published`)          |
| `get_blog_post`        | `slug`                                            | Retrieves a full blog post including Markdown body and reading time           |
| `create_blog_draft`    | `title`, `slug`, `body`, `tags`, `seoDescription` | Drafts a new article with automatic slug and excerpt generation               |
| `suggest_seo_metadata` | `title`, `body`                                   | Generates recommended SEO titles, descriptions, and tag arrays                |
| `list_forms`           | _none_                                            | Lists available dynamic forms and field schemas                               |
| `get_form_submissions` | `formId`, `limit`                                 | Retrieves sanitized form submissions and survey responses                     |

> [!IMPORTANT]
> **Strict Vault Isolation:** By architectural invariant, the encrypted Password Vault (`plugin-vault`) is **never exposed** to the MCP server. AI agents have zero access to credentials, passwords, or vault secrets.

---

### Connecting AI Agents & IDEs (Antigravity, Cursor, Copilot, Codex, Claude, Windsurf)

The Admin panel includes built-in quick presets and 1-click configuration generators at `/dashboard/tokens`:

1. Navigate to **Admin Panel** $\rightarrow$ **Settings** $\rightarrow$ **API & Agent Tokens** (or `/dashboard/tokens`).
2. Click **Generate New Agent / API Token**, choose your preferred agent preset (**Antigravity**, **Cursor**, **GitHub Copilot**, **OpenAI Codex**, **Claude Desktop**, or **Windsurf**), and generate the key.
3. Copy the pre-filled configuration snippet with 1-click into your editor's config file:

|                                              API & Agent Tokens Manager                                               |                                                  1-Click Multi-Agent Setup Modal                                                   |
| :-------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------: |
| ![API & Agent Tokens](docs/images/mcp-tokens-preview.png)<br><sub>Scoped access keys, expiration & agent badges</sub> | ![Agent Setup Modal](docs/images/mcp-token-modal-preview.png)<br><sub>Pre-filled configuration for Antigravity, Cursor, etc.</sub> |

| Agent / Editor                  | Target Configuration File             | Transport & Auth                           |
| :------------------------------ | :------------------------------------ | :----------------------------------------- |
| **Google Antigravity**          | `~/.gemini/config/mcp_config.json`    | Remote Streamable HTTP (`url` + `Bearer`)  |
| **Cursor IDE**                  | `.cursor/mcp.json`                    | Remote Streamable HTTP (`url` + `Bearer`)  |
| **GitHub Copilot**              | `~/.copilot/mcp-config.json`          | Remote Streamable HTTP (`url` + `Bearer`)  |
| **OpenAI Codex / Custom GPT**   | Custom GPT Action or API Header       | Streamable HTTP (`/api/mcp`) / REST Header |
| **Claude Desktop**              | `claude_desktop_config.json`          | Remote Streamable HTTP (`url` + `Bearer`)  |
| **Windsurf IDE (Codeium)**      | `~/.codeium/windsurf/mcp_config.json` | Remote Streamable HTTP (`url` + `Bearer`)  |
| **cURL & Automation Pipelines** | Direct HTTP Request                   | `Authorization: Bearer cms_token_...`      |

#### Primary: Remote Streamable HTTP Configuration (Recommended)

Add to your editor's configuration file (e.g. `~/.gemini/config/mcp_config.json`, `.cursor/mcp.json`, or `~/.copilot/mcp-config.json`):

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

#### Optional: Local `stdio` Alternative (via `plugins/plugin-mcp/api`)

For offline local development directly against the monorepo source:

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

Key security measures built into the platform:

- **Authentication & Sessions**
  - Passwords hashed with `bcrypt` (enforcing 72-byte truncation protection).
  - Dummy hash check on failed logins to prevent timing-based email enumeration.
  - `HttpOnly` and `SameSite` session cookies with `HS256` JWTs.
  - Instant session revocation (`POST /api/auth/sessions/revoke-all`).
  - First-run `/setup` wizard permanently locks once the initial admin is registered.

- **Access Control & API Defense**
  - Role-based permissions (`RBAC`) enforced across all plugin endpoints.
  - Scoped agent tokens (`pages:read`, `blog:write`) with fail-closed rejection.
  - Constant-time Double-Submit CSRF protection on state-changing requests.
  - Strict input validation with Zod schemas before database queries.
  - Disabled plugins are completely blocked at ingress (`503 Service Unavailable`).

- **Data Protection & Vault**
  - Secrets in `plugin-vault` are encrypted at rest with `AES-256-GCM` and unique IVs.
  - Encryption keys derived using Node.js native `Argon2id`.
  - Sensitive values (`password`, `token`, `secret`) are automatically redacted in server logs.

- **Uploads & Infrastructure**
  - Uploads verified by binary magic bytes (PNG, JPEG, WebP) with SVG/XML blocked against XSS.
  - Production Docker images strictly enforce non-root execution (`USER node`).

---

## 🧪 Testing & Commands

```bash
# Run build, typecheck, lint, and all tests in one command
npm run ci

# Or run individual steps:
npm test            # Run all unit and integration tests (258 passing, ~6s)
npm run typecheck   # Fast parallel typecheck across all 23 workspaces (~4.5s)
npm run lint        # Run ESLint across all workspaces (~5s)
npm run build       # Compile packages to dist/
npm run db:backup   # Save timestamped MongoDB archive to backups/
npm run db:restore  # Restore database from backups/backup-latest.archive
```

### ⚡ Fast Monorepo Scripts

- **Fast Parallel Typecheck (`npm run typecheck`):** Checks libraries via `tsc -b` and builds applications concurrently across CPU cores (~4.5s vs ~32s sequential). Dynamically detects workspaces from `package.json`.
- **One-Command CI (`npm run ci`):** Runs build, typecheck, lint, and all 258 tests in a single pass to ensure clean commits.
