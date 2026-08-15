export class ConfigService {
  private readonly env: Record<string, string | undefined>;

  constructor(env: Record<string, string | undefined>) {
    this.env = env;
  }

  get(key: string): string {
    const value = this.env[key];
    if (value === undefined || value === "") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  getOrDefault(key: string, defaultValue: string): string {
    const value = this.env[key];
    return value !== undefined && value !== "" ? value : defaultValue;
  }
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.env[key];
    if (value === undefined || value === "") return defaultValue;
    return value === "true" || value === "1";
  }

  getInt(key: string, defaultValue: number): number {
    const value = this.env[key];
    if (value === undefined || value === "") return defaultValue;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }
}
