import type { Collection, Db, Document } from "mongodb";

/**
 * Minimal database interface for dependency injection.
 *
 * Services depend on this interface (not the concrete DatabaseService class),
 * following the Interface Segregation Principle (ISP).
 *
 * This enables:
 * - DatabaseService to add new methods without breaking dependents
 * - Easy unit testing with plain stubs (no real MongoDB needed)
 * - Swapping implementations (MongoDB → PostgreSQL, in-memory, etc.)
 *
 * @example
 * // In a service constructor:
 * constructor(private readonly db: IDatabase) {}
 *
 * @example
 * // In tests:
 * const mockDb: IDatabase = {
 *   getCollection: vi.fn().mockReturnValue(mockCollection),
 *   getDb: vi.fn().mockReturnValue(mockMongoDb)
 * };
 * const service = new AuditLogService(mockDb, mockLogger);
 */
export interface IDatabase {
  /**
   * Get a typed MongoDB collection
   * @throws Error if database is not connected
   */
  getCollection<T extends Document = Document>(name: string): Collection<T>;

  /**
   * Get the MongoDB Db instance
   * @throws Error if database is not connected
   */
  getDb(): Db;
}
