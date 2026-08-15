import type { IDatabase } from "../types/IDatabase.js";
import type { Migration } from "../types/plugin.js";

export const migration: Migration = {
  id: "202608150002_cms_settings_key_index",
  up: async (db: IDatabase): Promise<void> => {
    await db.collection("cms_settings").createIndex({ key: 1 }, { unique: true });
  },
};
