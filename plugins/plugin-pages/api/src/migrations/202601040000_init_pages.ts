import type { IDatabase, Migration } from "@cms/core";

export const initPagesMigration: Migration = {
  id: "202601040000_init_pages",
  description: "Create indexes for cms_pages and cms_page_versions",
  up: async (db: IDatabase): Promise<void> => {
    const pagesCollection = db.collection("cms_pages");
    await pagesCollection.createIndex({ slug: 1 }, { unique: true });
    await pagesCollection.createIndex({ status: 1 });
    await pagesCollection.createIndex({ title: "text", "blocks.content": "text" });

    const versionsCollection = db.collection("cms_page_versions");
    await versionsCollection.createIndex({ pageId: 1, version: -1 });
  },
};
