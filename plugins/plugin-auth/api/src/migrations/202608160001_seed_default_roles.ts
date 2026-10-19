import type { IDatabase, Migration } from "@cms/core";

export const seedDefaultRolesMigration: Migration = {
  id: "202608160001_seed_default_roles",
  description: "Seed default editor and user system role templates if not present",
  async up(db: IDatabase): Promise<void> {
    const rolesCol = db.collection("cms_roles");
    const now = new Date();

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

    const admin = await rolesCol.findOne({ name: "admin" });
    if (admin && (!admin["description"] || admin["isSystem"] === undefined)) {
      await rolesCol.updateOne(
        { name: "admin" },
        {
          $set: {
            description:
              "Full platform administrative access across all system entities and settings",
            isSystem: true,
            updatedAt: now,
          },
        },
      );
    }
  },
};
