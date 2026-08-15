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
    const existingAdmin = await rolesCol.findOne({ name: "admin" });
    if (!existingAdmin) {
      const now = new Date();
      await rolesCol.insertOne({
        id: "admin",
        name: "admin",
        permissions: ["*"],
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
};
