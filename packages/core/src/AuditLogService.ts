import { database } from "@cms/db";
import { logger } from "./LogService.ts";
import { hooks } from "./HookManager.ts";

interface AuditEventDef {
  hookName: string;
  action: string;
  targetCollection: string;
  getPayload: (data: any, extra?: any) => Record<string, unknown>;
  getUser?: (data: any, extra?: any) => { id: string | null; email: string | null };
}

const auditDefinitions: AuditEventDef[] = [
  // 1. Page Actions
  {
    hookName: "page.created",
    action: "PAGE_CREATE",
    targetCollection: "cms_pages",
    getPayload: (page) => ({ title: page.title, slug: page.slug }),
  },
  {
    hookName: "page.updated",
    action: "PAGE_UPDATE",
    targetCollection: "cms_pages",
    getPayload: (page) => ({ title: page.title, slug: page.slug }),
  },
  {
    hookName: "page.deleted",
    action: "PAGE_DELETE",
    targetCollection: "cms_pages",
    getPayload: (page) => ({ title: page.title, slug: page.slug }),
  },
  // 2. Blog Actions
  {
    hookName: "blog.created",
    action: "BLOG_CREATE",
    targetCollection: "cms_blog_posts",
    getPayload: (post) => ({ title: post.title, slug: post.slug }),
  },
  {
    hookName: "blog.updated",
    action: "BLOG_UPDATE",
    targetCollection: "cms_blog_posts",
    getPayload: (post) => ({ title: post.title, slug: post.slug }),
  },
  {
    hookName: "blog.deleted",
    action: "BLOG_DELETE",
    targetCollection: "cms_blog_posts",
    getPayload: (post) => ({ title: post.title, slug: post.slug }),
  },
  // 3. Form Submission
  {
    hookName: "form.submitted",
    action: "FORM_SUBMIT",
    targetCollection: "cms_submissions",
    getPayload: (submission, formName) => ({ formName, data: submission.data }),
    getUser: () => ({ id: null, email: "anonymous" }),
  },
  // 4. System Settings
  {
    hookName: "settings.updated",
    action: "SETTINGS_UPDATE",
    targetCollection: "cms_settings",
    getPayload: (settings) => ({ brandName: settings.brandName }),
  },
  // 5. Auth Actions
  {
    hookName: "auth.login",
    action: "AUTH_LOGIN",
    targetCollection: "cms_users",
    getPayload: (user) => ({ email: user.email }),
    getUser: (user) => ({ id: user.id || null, email: user.email }),
  },
  {
    hookName: "auth.logout",
    action: "AUTH_LOGOUT",
    targetCollection: "cms_users",
    getPayload: () => ({}),
  },
  // 6. User Management
  {
    hookName: "user.created",
    action: "USER_CREATE",
    targetCollection: "cms_users",
    getPayload: (user) => ({ email: user.email, role: user.role }),
  },
  {
    hookName: "user.updated",
    action: "USER_UPDATE",
    targetCollection: "cms_users",
    getPayload: (user) => ({ email: user.email, role: user.role }),
  },
  {
    hookName: "user.deleted",
    action: "USER_DELETE",
    targetCollection: "cms_users",
    getPayload: (user) => ({ email: user.email }),
  },
  // 7. Role Management
  {
    hookName: "role.created",
    action: "ROLE_CREATE",
    targetCollection: "cms_roles",
    getPayload: (role) => ({ name: role.name }),
  },
  {
    hookName: "role.updated",
    action: "ROLE_UPDATE",
    targetCollection: "cms_roles",
    getPayload: (role) => ({ name: role.name }),
  },
  {
    hookName: "role.deleted",
    action: "ROLE_DELETE",
    targetCollection: "cms_roles",
    getPayload: (role) => ({ name: role.name }),
  }
];

export class AuditLogService {
  static init(): void {
    logger.info("🛡️ AuditLogService: Initializing audit log listeners...");

    for (const def of auditDefinitions) {
      hooks.on(def.hookName, async (data: unknown, actorOrExtra: unknown, ipOrExtra?: unknown) => {
        const dataObj = data as Record<string, unknown>;
        const actorObj = actorOrExtra as Record<string, unknown> | null;
        let user: { id: string | null; email: string | null } = { id: null, email: "anonymous" };
        let ip = "127.0.0.1";

        if (def.getUser) {
          user = def.getUser(data, actorOrExtra);
          ip = (ipOrExtra as string) ?? "127.0.0.1";
        } else {
          user = {
            id: (actorObj?.id as string) ?? null,
            email: (actorObj?.email as string) ?? "unknown",
          };
          ip = (ipOrExtra as string) ?? "127.0.0.1";
        }

        await this.log({
          userId: user.id,
          userEmail: user.email,
          action: def.action,
          targetCollection: def.targetCollection,
          targetId: dataObj ? (String(dataObj._id ?? dataObj.id ?? dataObj.slug ?? dataObj.name ?? dataObj.email ?? "") || null) : null,
          payload: def.getPayload(data, actorOrExtra),
          ip,
        });
      });
    }
  }

  private static async log(data: {
    userId: string | null;
    userEmail: string | null;
    action: string;
    targetCollection: string;
    targetId: string | null;
    payload: Record<string, unknown>;
    ip: string;
  }): Promise<void> {
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
