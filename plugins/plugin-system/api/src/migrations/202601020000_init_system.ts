import type { IDatabase, Migration } from "@cms/core";

export const initSystemMigration: Migration = {
  id: "202601020000_init_system",
  description: "Create indexes for cms_plugins and cms_audit_log",
  up: async (db: IDatabase): Promise<void> => {
    const pluginsCol = db.collection("cms_plugins");
    await pluginsCol.createIndex({ name: 1 }, { unique: true });

    const auditCol = db.collection("cms_audit_log");
    await auditCol.createIndex({ createdAt: -1 });
  },
};
