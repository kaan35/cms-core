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
[![Tests](https://img.shields.io/badge/Tests-225%20Passing-success?style=flat&logo=node.js)](#-testing--commands)

A modular, plugin-based content management and application platform built with **Fastify 5**, **Next.js 16 (React 19)**, **MongoDB 8**, and **Redis 8**. You can run it as a full website with a public frontend or as a private admin panel with only the plugins you need.

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

### 🌐 Public Web Client (`client-template`)

|                                                 Homepage (Dark)                                                 |                                                    Homepage (Light)                                                     |
| :-------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------: |
| ![Client Homepage Dark](docs/images/client-home-preview.png)<br><sub>Homepage with Bento grid (Dark mode)</sub> | ![Client Homepage Light](docs/images/client-home-light-preview.png)<br><sub>Homepage with Bento grid (Light mode)</sub> |

|                                                Contact Page (Dark)                                                 |                                                    Contact Page (Light)                                                    |
| :----------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------: |
| ![Client Contact Dark](docs/images/client-contact-preview.png)<br><sub>Contact form with captcha (Dark mode)</sub> | ![Client Contact Light](docs/images/client-contact-light-preview.png)<br><sub>Contact form with captcha (Light mode)</sub> |

---

## 🛠️ How to Use

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
| **Setup Wizard**      | [http://localhost:3002/setup](http://localhost:3002/setup)   | First-run screen to create the initial Superadmin account    |
| **Public Web Client** | [http://localhost:3003](http://localhost:3003)               | Sample Next.js 16 public website powered by the block engine |

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

| `PLUGINS_PROFILE`        | Loaded Plugins                                               | Typical Use Case                                                   |
| :----------------------- | :----------------------------------------------------------- | :----------------------------------------------------------------- |
| `full` _(default)_       | `auth`, `system`, `media`, `pages`, `blog`, `forms`, `vault` | All built-in plugins enabled                                       |
| `minimal`                | `auth`, `system`                                             | Core authentication, users, roles, and system settings only        |
| `vault`                  | `auth`, `system`, `vault`                                    | Private admin panel with the encrypted password manager            |
| `pages,blog,forms,media` | `auth`, `system`, `pages`, `blog`, `forms`, `media`          | Public website, blog, and contact forms without the password vault |

- **Core Plugins:** `auth` and `system` are always enabled in every project.
- **Automatic Sidebar Filtering:** Plugins omitted from `PLUGINS_PROFILE` are automatically marked `enabled: false` in the database so they do not appear in the Admin sidebar.
- **Runtime Toggles:** Installed plugins can also be turned on or off anytime from the Admin UI at `/dashboard/plugins`.
- **Startup Validation:** If an unknown plugin name is passed in `PLUGINS_PROFILE`, the server stops on startup with a clear error message listing the valid plugin names.

---

### 4. Docker Architecture: Development vs. Production

The platform supports hot-reload development and ultra-slim multi-stage production builds:

| Dimension | Local Development (`Dockerfile.dev`) | Production Deployment (`Dockerfile`) |
| :--- | :--- | :--- |
| **Image Size** | ~2.8 GB (includes `devDependencies`, compilers, `tsx`) | **~180 MB** (zero dev tooling, minimal standalone runtime) |
| **Execution** | Live host volume bind-mounts (`.:/app`) & hot-reload | Standalone compiled artifacts (`node dist/main.js`, Next.js standalone) |
| **Security** | Development debugging user | **Enforced `USER node` (non-root)**, reduced CVE surface |

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
│   ├── plugin-auth/     ← Authentication, RBAC permissions, active sessions, CSRF protection
│   ├── plugin-system/   ← Audit logs, feature flags, brand settings, runtime plugin toggles
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

## 🧱 Web Client Block Engine (`client-template`)

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

## 🛡️ Security Architecture

The platform is designed around strict fail-closed and standard OWASP Top 10 web security guidelines:

- **Authentication & Passwords:** Passwords are hashed with `bcrypt` (enforcing a 72-byte input limit) and login requests run a dummy check when an email is not found to prevent timing-based user enumeration.
- **Sessions & Access Control:** Uses `HttpOnly`, `SameSite` cookies and `HS256` JWTs with role-based permissions (`checkPermission`) and one-click session revocation (`POST /api/auth/sessions/revoke-all`). The initial `/setup` route locks permanently after the first admin is created.
- **CSRF & Input Validation:** State-changing requests require a Double-Submit CSRF token verified in constant time. All request bodies, queries, and parameters are validated with Zod schemas before reaching MongoDB.
- **Password Vault Encryption:** Secrets stored in `plugin-vault` are encrypted at rest with `AES-256-GCM` using a unique 12-byte IV per item and a key derived via Node.js built-in `Argon2id`.
- **Server-Side Ingress Guard (`PluginGuard`):** Ingress middleware blocks direct API access to disabled plugins with an immediate fail-closed `503 Service Unavailable`.
- **Container Hardening (Non-Root User):** Production Dockerfiles enforce `USER node` (non-root) to minimize the host attack surface and prevent container breakout vulnerabilities.
- **Zero-Dependency Native Data Engine:** Excel (`.xlsx`) and RFC 4180 CSV export with UTF-8 BOM are generated natively using Node.js built-in `node:zlib` without third-party spreadsheet dependencies.
- **File Uploads & Logging:** `plugin-media` verifies binary file signatures (PNG, JPEG, WebP magic bytes), enforces a 10 MB limit, renames files to UUIDs, and blocks SVG/XML uploads. Sensitive fields (`password`, `token`, `secret`, `cookie`) are automatically redacted in logs.

---

## 🧪 Testing & Commands

```bash
# Run build, typecheck, lint, and all tests in one command
npm run ci

# Or run individual steps:
npm test            # Run all unit and integration tests (225 passing, ~5.5s)
npm run typecheck   # Dynamic parallel typecheck across all 22 workspaces (~4s)
npm run lint        # Run ESLint across all workspaces (~5s)
npm run build       # Compile packages to dist/
npm run db:backup   # Save timestamped MongoDB archive to backups/
npm run db:restore  # Restore database from backups/backup-latest.archive
```

### ⚡ Dynamic Monorepo Tooling

- **Parallel Typechecking (`scripts/typecheck.mjs`):** Replaces slow sequential `npm --workspaces` execution (~32s) with an optimized parallel runner (~4s). It checks all composite library packages in a single pass via `tsc -b --noEmit` while simultaneously compiling standalone applications (`api`, `admin`, `client-template`, `cli`) concurrently across CPU cores. Workspaces are discovered dynamically at runtime from `package.json`, requiring zero configuration updates when adding or removing plugins.
- **Fail-Closed Verification:** Captures process exit codes across all concurrent compilation targets to ensure zero silent failures in CI/CD pipelines.
