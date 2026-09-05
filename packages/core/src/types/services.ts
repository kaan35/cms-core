export type HookHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface IHookManager {
  on<T>(event: string, handler: HookHandler<T>): void;
  emit<T>(event: string, payload: T): Promise<void>;
  off(event: string): void;
}

export interface IConfigService {
  get(key: string): string;
  getOrDefault(key: string, defaultValue: string): string;
  getBoolean(key: string, defaultValue?: boolean): boolean;
  getInt(key: string, defaultValue: number): number;
}

export interface ISettingsService {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set(key: string, value: unknown): Promise<void>;
}

export interface RedirectDoc extends Record<string, unknown> {
  from: string;
  to: string;
  createdAt: Date;
}

export interface IRedirectsService {
  findByFrom(from: string): Promise<RedirectDoc | null>;
  create(from: string, to: string): Promise<void>;
  delete(from: string): Promise<void>;
  list(): Promise<RedirectDoc[]>;
}
