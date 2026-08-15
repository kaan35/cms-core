import type { IDatabase } from "../types/IDatabase.js";
import type { Migration } from "../types/plugin.js";

export const migration: Migration = {
  id: "202608150001_cms_redirects_from_index",
  up: async (db: IDatabase): Promise<void> => {
    await db.collection("cms_redirects").createIndex({ from: 1 }, { unique: true });
  },
};
