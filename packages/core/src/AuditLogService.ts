import { database } from "@cms/db";
import { logger } from "./LogService.ts";
import { hooks } from "./HookManager.ts";

export class AuditLogService {
  static init() {
    logger.info("🛡️ AuditLogService: Initializing audit log listeners...");

    // 1. Page Actions
    hooks.on("page.created", async (page: any, user: any, ip?: string) => {
      await this.log({
        userId: user?.id,
        userEmail: user?.email,
        action: "PAGE_CREATE",
        targetCollection: "cms_pages",
        targetId: page._id || page.slug,
        payload: { title: page.title, slug: page.slug },
        ip: ip || "127.0.0.1",
      });
    });

    hooks.on("page.updated", async (page: any, user: any, ip?: string) => {
      await this.log({
        userId: user?.id,
        userEmail: user?.email,
        action: "PAGE_UPDATE",
        targetCollection: "cms_pages",
        targetId: page._id || page.slug,
        payload: { title: page.title, slug: page.slug },
        ip: ip || "127.0.0.1",
      });
    });

    hooks.on("page.deleted", async (page: any, user: any, ip?: string) => {
      await this.log({
        userId: user?.id,
        userEmail: user?.email,
        action: "PAGE_DELETE",
        targetCollection: "cms_pages",
        targetId: page._id || page.slug,
        payload: { title: page.title, slug: page.slug },
        ip: ip || "127.0.0.1",
      });
    });

    // 2. Blog Actions
    hooks.on("blog.created", async (post: any, user: any, ip?: string) => {
      await this.log({
        userId: user?.id,
        userEmail: user?.email,
        action: "BLOG_CREATE",
        targetCollection: "cms_blog_posts",
        targetId: post._id || post.slug,
        payload: { title: post.title, slug: post.slug },
        ip: ip || "127.0.0.1",
      });
    });

    hooks.on("blog.updated", async (post: any, user: any, ip?: string) => {
      await this.log({
        userId: user?.id,
        userEmail: user?.email,
        action: "BLOG_UPDATE",
        targetCollection: "cms_blog_posts",
        targetId: post._id || post.slug,
        payload: { title: post.title, slug: post.slug },
        ip: ip || "127.0.0.1",
      });
    });

    hooks.on("blog.deleted", async (post: any, user: any, ip?: string) => {
      await this.log({
        userId: user?.id,
        userEmail: user?.email,
        action: "BLOG_DELETE",
        targetCollection: "cms_blog_posts",
        targetId: post._id || post.slug,
        payload: { title: post.title, slug: post.slug },
        ip: ip || "127.0.0.1",
      });
    });

    // 3. Form Submission
    hooks.on("form.submitted", async (submission: any, formName: string, ip?: string) => {
      await this.log({
        userId: null,
        userEmail: "anonymous",
        action: "FORM_SUBMIT",
        targetCollection: "cms_submissions",
        targetId: submission._id || submission.formId,
        payload: { formName, data: submission.data },
        ip: ip || "127.0.0.1",
      });
    });
  }

  private static async log(data: {
    userId: string | null;
    userEmail: string | null;
    action: string;
    targetCollection: string;
    targetId: any;
    payload: any;
    ip: string;
  }) {
    try {
      const db = database.getDb();
      if (!db) return;

      const auditCol = db.collection("cms_audit_logs");
      await auditCol.insertOne({
        ...data,
        createdAt: new Date(),
      });
      logger.debug(`🛡️ AuditLog: Recorded ${data.action} on ${data.targetCollection}`);
    } catch (err) {
      logger.error(err, "💥 AuditLogService failed to write log entry");
    }
  }
}
