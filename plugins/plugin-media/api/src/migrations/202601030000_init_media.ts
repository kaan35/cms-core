import type { IDatabase, Migration } from "@cms/core";

export const initMediaMigration: Migration = {
  id: "202601030000_init_media",
  description: "Create indexes for cms_media",
  up: async (db: IDatabase): Promise<void> => {
    const mediaCollection = db.collection("cms_media");
    await mediaCollection.createIndex({ key: 1 }, { unique: true });
    await mediaCollection.createIndex({ createdAt: -1 });
  },
};
