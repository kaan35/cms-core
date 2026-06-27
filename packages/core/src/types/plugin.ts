import type { FastifyInstance } from "fastify";

/**
 * CmsPlugin interface — her plugin bu interface'i implement etmelidir.
 * CLI tarafından kopyalanan plugin'ler bu contract'a uyarak çalışır.
 */
export interface CmsPlugin {
  /** Unique package name — örn: "@cms/plugin-blog-api" */
  name: string;
  /** Semantic version string */
  version: string;
  /**
   * Fastify instance'a route ve decorator ekler.
   * fastify-plugin ile wrap edilmeli ki decorator'lar üst scope'a yayılsın.
   */
  register: (app: FastifyInstance, options?: Record<string, any>) => Promise<void>;
  /** Opsiyonel: Plugin ilk kez DB'ye eklendiğinde çağrılır */
  onInstall?: () => Promise<void>;
  /** Opsiyonel: Plugin enable edildiğinde çağrılır */
  onEnable?: () => Promise<void>;
  /** Opsiyonel: Plugin disable edildiğinde çağrılır */
  onDisable?: () => Promise<void>;
  /** Bu plugin'in gerektirdiği permission listesi */
  permissions?: string[];
}
