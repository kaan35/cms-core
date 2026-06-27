import { logger } from "./LogService.ts";

type HookCallback = (...args: any[]) => any;

interface HookListener {
  callback: HookCallback;
  priority: number;
}

export class HookManager {
  private actions: Map<string, HookListener[]> = new Map();
  private filters: Map<string, HookListener[]> = new Map();

  // ACTIONS (Side effects)
  addAction(hookName: string, callback: HookCallback, priority = 10): void {
    if (!this.actions.has(hookName)) {
      this.actions.set(hookName, []);
    }
    const listeners = this.actions.get(hookName)!;
    listeners.push({ callback, priority });
    listeners.sort((a, b) => a.priority - b.priority);
    logger.debug(`🔌 Action Hook registered: [${hookName}] with priority ${priority}`);
  }

  async doAction(hookName: string, ...args: any[]): Promise<void> {
    const listeners = this.actions.get(hookName);
    if (!listeners || listeners.length === 0) return;

    for (const listener of listeners) {
      try {
        await Promise.resolve(listener.callback(...args));
      } catch (err) {
        logger.error(err, `💥 Error in Action Hook [${hookName}]`);
      }
    }
  }

  // ALIAS FOR ACTIONS
  on(event: string, callback: HookCallback, priority = 10): void {
    this.addAction(event, callback, priority);
  }

  async emit(event: string, ...args: any[]): Promise<void> {
    await this.doAction(event, ...args);
  }

  // FILTERS (Modify data)
  addFilter(hookName: string, callback: HookCallback, priority = 10): void {
    if (!this.filters.has(hookName)) {
      this.filters.set(hookName, []);
    }
    const listeners = this.filters.get(hookName)!;
    listeners.push({ callback, priority });
    listeners.sort((a, b) => a.priority - b.priority);
    logger.debug(`🔌 Filter Hook registered: [${hookName}] with priority ${priority}`);
  }

  async applyFilters<T = any>(hookName: string, value: T, ...args: any[]): Promise<T> {
    const listeners = this.filters.get(hookName);
    if (!listeners || listeners.length === 0) return value;

    let currentValue = value;
    for (const listener of listeners) {
      try {
        currentValue = await Promise.resolve(listener.callback(currentValue, ...args));
      } catch (err) {
        logger.error(err, `💥 Error in Filter Hook [${hookName}]`);
      }
    }
    return currentValue;
  }
}

export const hooks = new HookManager();
export default hooks;
