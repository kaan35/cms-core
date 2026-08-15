import type { IDatabase, Migration } from "@cms/core";

export const initFormsMigration: Migration = {
  id: "202601060000_init_forms",
  async up(db: IDatabase): Promise<void> {
    const formsCol = db.collection("cms_forms");
    await formsCol.createIndex({ slug: 1 }, { unique: true });
    await formsCol.createIndex({ createdAt: -1 });

    const submissionsCol = db.collection("cms_form_submissions");
    await submissionsCol.createIndex({ formId: 1, createdAt: -1 });
  },
  async down(db: IDatabase): Promise<void> {
    void db;
  },
};
