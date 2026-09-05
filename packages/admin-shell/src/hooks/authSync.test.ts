import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("Cross-Tab Auth Synchronization (BroadcastChannel)", () => {
  const AUTH_CHANNEL_NAME = "cms_auth_channel";

  it("broadcasts LOGOUT event to other listening tabs/instances", async () => {
    const tab1 = new BroadcastChannel(AUTH_CHANNEL_NAME);
    const tab2 = new BroadcastChannel(AUTH_CHANNEL_NAME);

    const receivedMessages: unknown[] = [];
    tab2.onmessage = (event) => {
      receivedMessages.push(event.data);
    };

    tab1.postMessage({ type: "LOGOUT" });

    // Allow event queue loop tick
    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.equal(receivedMessages.length, 1);
    assert.deepEqual(receivedMessages[0], { type: "LOGOUT" });

    tab1.close();
    tab2.close();
  });

  it("does not receive messages on unrelated channel names", async () => {
    const authTab = new BroadcastChannel(AUTH_CHANNEL_NAME);
    const otherTab = new BroadcastChannel("cms_unrelated_channel");

    const receivedMessages: unknown[] = [];
    authTab.onmessage = (event) => {
      receivedMessages.push(event.data);
    };

    otherTab.postMessage({ type: "LOGOUT" });

    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.equal(receivedMessages.length, 0);

    authTab.close();
    otherTab.close();
  });

  it("broadcasts to multiple listening tabs simultaneously", async () => {
    const sender = new BroadcastChannel(AUTH_CHANNEL_NAME);
    const tabA = new BroadcastChannel(AUTH_CHANNEL_NAME);
    const tabB = new BroadcastChannel(AUTH_CHANNEL_NAME);

    let tabAReceived = false;
    let tabBReceived = false;

    tabA.onmessage = (e) => {
      if (e.data?.type === "LOGOUT") tabAReceived = true;
    };
    tabB.onmessage = (e) => {
      if (e.data?.type === "LOGOUT") tabBReceived = true;
    };

    sender.postMessage({ type: "LOGOUT" });

    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.equal(tabAReceived, true);
    assert.equal(tabBReceived, true);

    sender.close();
    tabA.close();
    tabB.close();
  });
});
