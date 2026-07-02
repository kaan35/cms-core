import { database } from "@cms/db";
import { hooks } from "./HookManager.ts";
import { logger } from "./LogService.ts";

export class WebhookService {
  static init() {
    logger.info("⚡ WebhookService: Initializing event listeners...");

    const eventsToTrigger = [
      "blog.created",
      "blog.deleted",
      "blog.updated",
      "form.submitted",
      "page.created",
      "page.deleted",
      "page.updated",
    ];

    for (const eventName of eventsToTrigger) {
      hooks.on(eventName, async (data: unknown, actor: unknown, _ip?: string) => {
        await this.dispatch(eventName, {
          event: eventName,
          timestamp: new Date().toISOString(),
          actor: actor && typeof actor === "object" && "id" in actor
            ? { id: (actor as Record<string, unknown>).id, email: (actor as Record<string, unknown>).email, role: (actor as Record<string, unknown>).role }
            : null,
          data,
        });
      });
    }
  }

  private static async dispatch(event: string, payload: unknown) {
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

  private static async sendRequest(url: string, payload: unknown) {
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
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : String(err);
      logger.error(err, `💥 Webhook HTTP POST failed for ${url}: ${message}`);
    }
  }
}
