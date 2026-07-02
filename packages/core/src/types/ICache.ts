/**
 * Minimal cache interface for dependency injection.
 *
 * Services depend on this interface (not the concrete RedisCacheService class),
 * following the Interface Segregation Principle (ISP).
 *
 * This enables:
 * - Swapping Redis with in-memory cache, Memcached, etc.
 * - Easy unit testing with mock cache
 * - RedisCacheService to add methods without breaking dependents
 *
 * @example
 * // In a service constructor:
 * constructor(private readonly cache: ICache) {}
 *
 * @example
 * // In tests:
 * const mockCache: ICache = {
 *   get: vi.fn(),
 *   set: vi.fn(),
 *   delete: vi.fn(),
 *   deleteByPattern: vi.fn(),
 *   isAlive: vi.fn().mockReturnValue(true)
 * };
 * const service = new MyService(mockCache);
 */
export interface ICache {
  /**
   * Get a value from cache
   * @returns Parsed value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with optional TTL
   * @param ttlSeconds Time to live in seconds (default: 300)
   */
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a single key from cache
   */
  delete(key: string): Promise<void>;

  /**
   * Delete all keys matching a pattern (regex or glob)
   */
  deleteByPattern(pattern: string): Promise<void>;

  /**
   * Check if cache connection is alive
   */
  isAlive(): boolean;
}
