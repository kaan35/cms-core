type HookHandler<T = unknown> = (payload: T) => void | Promise<void>;

export class HookManager {
  private readonly listeners = new Map<string, Array<HookHandler<unknown>>>();

  on<T>(event: string, handler: HookHandler<T>): void {
    const existing = this.listeners.get(event) ?? [];
    this.listeners.set(event, [...existing, handler as HookHandler<unknown>]);
  }

  async emit<T>(event: string, payload: T): Promise<void> {
    const handlers = this.listeners.get(event) ?? [];
    for (const handler of handlers) {
      await handler(payload);
    }
  }

  off(event: string): void {
    this.listeners.delete(event);
  }
}
