import type { IDatabase } from "../types/IDatabase.js";
import type { ILogger } from "../types/ILogger.js";
import type { Migration } from "../types/plugin.js";

interface MigrationRecord extends Record<string, unknown> {
  id: string;
  appliedAt: Date;
}

export async function runMigrations(
  db: IDatabase,
  logger: ILogger,
  migrations: Migration[],
): Promise<void> {
  const collection = db.collection<MigrationRecord>("cms_migrations");

  const applied = await collection.find();
  const appliedIds = new Set(applied.map((m) => m.id));

  const pending = migrations
    .filter((m) => !appliedIds.has(m.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (pending.length === 0) {
    logger.debug("No pending migrations");
    return;
  }

  for (const migration of pending) {
    logger.info(`Applying migration: ${migration.id}`);
    try {
      await migration.up(db);
      await collection.insertOne({ id: migration.id, appliedAt: new Date() });
      logger.info(`Migration applied: ${migration.id}`);
    } catch (err) {
      logger.error(`Migration failed: ${migration.id}`, {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}
