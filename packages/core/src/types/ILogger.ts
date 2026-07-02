/**
 * Minimal logger interface for dependency injection.
 *
 * Services depend on this interface (not the concrete LogService class),
 * following the Interface Segregation Principle (ISP).
 *
 * This enables:
 * - LogService to add new methods (debug, trace) without breaking dependents
 * - Easy unit testing with plain stubs (no real Pino needed)
 *
 * @example
 * // In a service constructor:
 * constructor(private readonly logger: ILogger) {}
 *
 * @example
 * // In tests:
 * const mockLogger: ILogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
 * const db = new DatabaseService(mockConfig, mockLogger);
 */
export interface ILogger {
  info(message: string, ...args: unknown[]): void;
  error(data: unknown, message: string): void;
  warn(message: string, ...args: unknown[]): void;
}
