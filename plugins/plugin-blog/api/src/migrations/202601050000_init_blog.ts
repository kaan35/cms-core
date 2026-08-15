import type { IDatabase, Migration } from "@cms/core";

export const initBlogMigration: Migration = {
  id: "202601050000_init_blog",
  async up(db: IDatabase): Promise<void> {
    const posts = db.collection("cms_blog_posts");
    await posts.createIndex({ slug: 1 }, { unique: true });
    await posts.createIndex({ status: 1 });
    await posts.createIndex({ createdAt: -1 });
    await posts.createIndex({ title: "text", summary: "text", content: "text" });

    const versions = db.collection("cms_post_versions");
    await versions.createIndex({ postId: 1, version: -1 });
  },
  async down(db: IDatabase): Promise<void> {
    void db;
  },
};
