import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  AuditLogDoc,
  BlogPostDoc,
  BlogPostStatus,
  ClientConfig,
  FeatureFlagDoc,
  FormDoc,
  FormField,
  FormSubmissionDoc,
  MediaDoc,
  MediaFolderDoc,
  NavigationMenuItem,
  PageBlock,
  PageDoc,
  PageStatus,
  PaginatedResult,
  PluginDoc,
  RoleDoc,
  SessionDoc,
  SettingsDoc,
  SystemSettingsDoc,
  UserDoc,
} from "./index";

describe("Client SDK Types", () => {
  it("verifies single source of truth type shapes", () => {
    const page: PageDoc = {
      id: "page-1",
      title: "Home",
      slug: "home",
      status: "published" as PageStatus,
      blocks: [],
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(page.id, "page-1");

    const block: PageBlock = {
      type: "hero",
      title: "Hero Title",
    };
    assert.equal(block.type, "hero");

    const post: BlogPostDoc = {
      id: "post-1",
      title: "Blog Post",
      slug: "blog-post",
      summary: "Summary",
      content: "Content",
      status: "published" as BlogPostStatus,
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(post.id, "post-1");

    const field: FormField = {
      name: "email",
      label: "Email Address",
      type: "email",
      required: true,
    };
    const form: FormDoc = {
      id: "form-1",
      title: "Contact",
      slug: "contact",
      fields: [field],
      captchaProvider: "challenge",
      challengeType: "alphanumeric",
      submitButtonText: "Send",
      successMessage: "Success",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(form.fields.length, 1);

    const submission: FormSubmissionDoc = {
      id: "sub-1",
      formId: form.id,
      data: { email: "test@example.com" },
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(submission.id, "sub-1");

    const media: MediaDoc = {
      id: "media-1",
      filename: "photo.jpg",
      key: "uploads/photo.jpg",
      url: "/uploads/photo.jpg",
      mimeType: "image/jpeg",
      size: 1024,
      uploaderId: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(media.id, "media-1");

    const folder: MediaFolderDoc = {
      id: "folder-1",
      name: "Gallery",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(folder.name, "Gallery");

    const user: UserDoc = {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin",
      roleId: "role-admin",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(user.id, "user-1");

    const role: RoleDoc = {
      id: "role-admin",
      name: "Admin",
      permissions: ["*"],
      isSystem: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(role.id, "role-admin");

    const session: SessionDoc = {
      id: "sess-1",
      userId: user.id,
      token: "jwt-token",
      expiresAt: "2026-01-02T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(session.id, "sess-1");

    const navItem: NavigationMenuItem = {
      id: "item-1",
      label: "Home",
      url: "/",
    };
    const settings: SettingsDoc = {
      siteTitle: "Platform CMS",
      brandColor: "#0055ff",
      headerMenu: [navItem],
    };
    const systemSettings: SystemSettingsDoc = settings;
    assert.equal(systemSettings.siteTitle, "Platform CMS");

    const plugin: PluginDoc = {
      id: "plugin-1",
      name: "blog",
      version: "1.0.0",
      enabled: true,
      installedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(plugin.enabled, true);

    const flag: FeatureFlagDoc = {
      id: "flag-1",
      key: "dark-mode",
      enabled: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(flag.key, "dark-mode");

    const audit: AuditLogDoc = {
      id: "audit-1",
      action: "settings.update",
      actorId: "user-1",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(audit.action, "settings.update");

    const paginated: PaginatedResult<PageDoc> = {
      data: [page],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    };
    assert.equal(paginated.data.length, 1);

    const config: ClientConfig = {
      baseUrl: "https://example.com",
    };
    assert.equal(config.baseUrl, "https://example.com");
  });
});
