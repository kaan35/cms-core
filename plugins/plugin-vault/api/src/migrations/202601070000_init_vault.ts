import type { IDatabase, Migration } from "@cms/core";

export const initVaultMigration: Migration = {
  id: "202601070000_init_vault",
  async up(db: IDatabase): Promise<void> {
    const col = db.collection("cms_vault_items");
    await col.createIndex({ id: 1 }, { unique: true });
    await col.createIndex({ category: 1 });
    await col.createIndex({ createdAt: -1 });
  },
  async down(db: IDatabase): Promise<void> {
    void db;
  },
};
