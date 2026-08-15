import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HookManager } from "./HookManager.js";

describe("HookManager", () => {
  it("calls all listeners registered for an event", async () => {
    const hooks = new HookManager();
    const results: number[] = [];

    hooks.on<number>("test", (n) => {
      results.push(n);
    });
    hooks.on<number>("test", (n) => {
      results.push(n * 2);
    });

    await hooks.emit("test", 5);

    assert.deepEqual(results, [5, 10]);
  });

  it("does nothing when no listeners are registered", async () => {
    const hooks = new HookManager();
    // Should not throw
    await hooks.emit("nonexistent", { some: "data" });
  });

  it("awaits async handlers before calling the next", async () => {
    const hooks = new HookManager();
    const order: string[] = [];

    hooks.on("seq", async () => {
      await new Promise<void>((r) => setTimeout(r, 10));
      order.push("first");
    });
    hooks.on("seq", () => {
      order.push("second");
    });

    await hooks.emit("seq", null);
    assert.deepEqual(order, ["first", "second"]);
  });

  it("isolates listeners by event name", async () => {
    const hooks = new HookManager();
    const a: string[] = [];
    const b: string[] = [];

    hooks.on("event-a", () => {
      a.push("a");
    });
    hooks.on("event-b", () => {
      b.push("b");
    });

    await hooks.emit("event-a", null);

    assert.deepEqual(a, ["a"]);
    assert.deepEqual(b, []);
  });

  it("off() removes all listeners for an event", async () => {
    const hooks = new HookManager();
    let called = false;

    hooks.on("ev", () => {
      called = true;
    });
    hooks.off("ev");
    await hooks.emit("ev", null);

    assert.equal(called, false);
  });
});
