import { database } from "@cms/db";
import { logger } from "./LogService.ts";
import { hooks } from "./HookManager.ts";

export class WebhookService {
  static init() {
    logger.info("⚡ WebhookService: Initializing event listeners...");

    const eventsToTrigger = [
      "page.created",
      "page.updated",
      "page.deleted",
      "blog.created",
      "blog.updated",
      "blog.deleted",
      "form.submitted",
    ];

    for (const eventName of eventsToTrigger) {
      hooks.on(eventName, async (data: any, actor: any, ip?: string) => {
        await this.dispatch(eventName, {
          event: eventName,
          timestamp: new Date().toISOString(),
          actor: actor ? { id: actor.id, email: actor.email, role: actor.role } : null,
          data,
        });
      });
    }
  }

  private static async dispatch(event: string, payload: any) {
    try {
      const db = database.getDb();
      if (!db) return;

      const webhookCol = db.collection("cms_webhooks");
      const webhooks = await webhookCol
        .find({
          $or: [{ events: event }, { events: "*" }],
          isActive: true,
        })
        .toArray();

      if (webhooks.length === 0) return;

      logger.info(`⚡ WebhookService: Dispatching ${event} to ${webhooks.length} endpoints...`);

      for (const wh of webhooks) {
        this.sendRequest(wh.url, payload).catch((err) => {
          logger.error(err, `💥 Webhook send failed for URL: ${wh.url}`);
        });
      }
    } catch (err) {
      logger.error(err, "💥 WebhookService failed to fetch/dispatch webhooks");
    }
  }

  private static async sendRequest(url: string, payload: any) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "CMS-Webhook/1.0",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        logger.warn(`⚠️ Webhook URL ${url} returned status code: ${res.status}`);
      } else {
        logger.debug(`✅ Webhook request successful for URL: ${url}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.error(`💥 Webhook HTTP POST failed for ${url}: ${err.message}`);
    }
  }
}
