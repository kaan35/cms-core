import type { IDatabase, Migration } from "@cms/core";

export const initAuthMigration: Migration = {
  id: "202601010000_init_auth",
  description: "Create indexes and seed default admin role",
  async up(db: IDatabase): Promise<void> {
    const usersCol = db.collection("cms_users");
    await usersCol.createIndex({ email: 1 }, { unique: true });

    const sessionsCol = db.collection("cms_sessions");
    await sessionsCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 } as Record<
      string,
      unknown
    >);

    const rolesCol = db.collection("cms_roles");
    const now = new Date();

    const existingAdmin = await rolesCol.findOne({ name: "admin" });
    if (!existingAdmin) {
      await rolesCol.insertOne({
        id: "admin",
        description: "Full platform administrative access across all system entities and settings",
        isSystem: true,
        name: "admin",
        permissions: ["*"],
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingEditor = await rolesCol.findOne({ name: "editor" });
    if (!existingEditor) {
      await rolesCol.insertOne({
        id: "editor",
        name: "editor",
        description:
          "Content management permissions for pages, blog posts, forms, and media assets",
        permissions: [
          "blog:read:draft",
          "blog:write",
          "forms:read",
          "forms:write",
          "media:read",
          "media:write",
          "pages:read:draft",
          "pages:write",
        ],
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingUser = await rolesCol.findOne({ name: "user" });
    if (!existingUser) {
      await rolesCol.insertOne({
        id: "user",
        name: "user",
        description: "Standard member profile with basic authenticated member access",
        permissions: [],
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
};
