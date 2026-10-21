# @cms/plugin-mcp-api

> **Model Context Protocol (MCP) Server for CMS Core** — Connect autonomous AI coding assistants (**Google Antigravity**, **Claude Desktop**, **Cursor**, **GitHub Copilot**, **Windsurf**, and **OpenAI Codex**) to your headless CMS over standard Remote Streamable HTTP (`/api/mcp`) or local Stdio (`cms-mcp`).

---

## 🎯 What is it?

`@cms/plugin-mcp-api` exposes your CMS capabilities to AI coding assistants as standard Model Context Protocol (MCP) tools. With this plugin, your AI can draft blog articles, inspect page layouts, query form submissions, and check system health—strictly bound to granular token permissions.

---

## 🚀 Quick Start (How to Use)

1. **Generate an Agent Token:** In CMS Admin (`/dashboard/tokens`), click **"Generate Token"** and pick the scopes you want to grant (e.g., `pages:read`, `blog:write`).
2. **Add to Your Editor:** Click **"Connect to IDE"** in Admin or add this to your editor's MCP config:

```json
{
  "mcpServers": {
    "cms": {
      "url": "http://localhost:3001/api/mcp",
      "headers": {
        "Authorization": "Bearer cms_token_your_api_token_here"
      }
    }
  }
}
```

3. **Instruct Your AI Assistant:**
   - *"Draft a new blog post about TypeScript performance tips."*
   - *"List active forms and check the latest submissions."*
   - *"Check system health and total published pages."*

---

## 🛠️ Available MCP Tools

| Tool | Description | Required Scope |
| :--- | :--- | :--- |
| `get_system_status` | Health check, DB/cache status, and entity counts | `*` or `system:settings:read` |
| `list_pages` | Lists pages with block counts, metadata, and status | `pages:read` |
| `get_page` | Retrieves a page with full layout blocks (Hero, Bento, etc.) | `pages:read` |
| `create_page_draft` | Creates a new unpublished page draft with structured blocks | `pages:write` |
| `list_blog_posts` | Lists articles with publish status and categories | `blog:read` |
| `get_blog_post` | Retrieves full markdown article content and metadata | `blog:read` |
| `create_blog_draft` | Creates a new draft article with tags and excerpt | `blog:write` |
| `suggest_seo_metadata`| Generates SEO title, description, and tags | `pages:read` or `blog:read` |
| `list_forms` | Lists active forms and field schemas | `forms:read` |
| `get_form_submissions`| Retrieves customer form entries and inquiries | `forms:read` |

---

## 🛡️ Security & Auditing

- **Vault Isolation:** The password manager (`plugin-vault`) is physically excluded from MCP registration. AI agents cannot read or touch stored secrets.
- **Fail-Closed RBAC:** Requests without required scopes fail immediately with `403 Forbidden`.
- **Audit Logging:** Every tool call is logged in `cms_audit_log` with actor prefix, latency (`ms`), and outcome badge (`success`, `access_denied`, or `error`).
