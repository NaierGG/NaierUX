import assert from "node:assert/strict";
import { MessengerEngine } from "../../src/core/messengerEngine";
import { createIdentityProfile } from "../../src/core/identity";
import { createLocalKeyAgreement, establishSession, restoreLocalKeyAgreement, serializeLocalKeyAgreement } from "../../src/core/crypto";
import type { EncryptedPacket, RouteMode, RouteStatus } from "../../src/core/types";
import type { NetworkAdapter, SendResult } from "../../src/core/network";
import { exportEncryptedAppBackup, importEncryptedAppBackup, loadPersistedAppState, savePersistedAppState } from "../../src/state/appStateStore";
import { loadPersistedIdentityState, savePersistedIdentityState } from "../../src/state/identityStore";

type PacketHandler = (packet: EncryptedPacket, fromPeerId: string) => void;

class DeterministicP2PAdapter implements NetworkAdapter {
  static readonly handlers = new Map<string, Set<PacketHandler>>();
  static clear() {
    this.handlers.clear();
  }

  readonly name = "DeterministicP2PAdapter";
  private localPeerId = "";
  private route: RouteMode = "Direct P2P";
  private started = false;

  async start(localPeerId: string): Promise<void> {
    this.localPeerId = localPeerId;
    this.started = true;
    if (!DeterministicP2PAdapter.handlers.has(localPeerId)) {
      DeterministicP2PAdapter.handlers.set(localPeerId, new Set());
    }
  }

  async stop(): Promise<void> {
    if (this.localPeerId) {
      DeterministicP2PAdapter.handlers.delete(this.localPeerId);
    }
    this.localPeerId = "";
    this.started = false;
  }

  setRoute(route: RouteMode): void {
    this.route = route;
  }

  getRoute(): RouteMode {
    return this.route;
  }

  getRouteStatus(): RouteStatus {
    return {
      route: this.route,
      bars: 5,
      latencyMs: 10,
      label: "deterministic",
    };
  }

  nextFallbackRoute(route: RouteMode): RouteMode {
    if (route === "Direct P2P") return "2-hop Relay";
    if (route === "2-hop Relay") return "Tor";
    return "2-hop Relay";
  }

  subscribePackets(handler: PacketHandler): () => void {
    if (!this.localPeerId) {
      return () => {};
    }
    const set = DeterministicP2PAdapter.handlers.get(this.localPeerId);
    if (!set) {
      return () => {};
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  async sendPacket(packet: EncryptedPacket, toPeerId: string): Promise<SendResult> {
    if (!this.started) {
      return {
        delivered: false,
        routeUsed: this.route,
        latencyMs: 0,
        relayHops: 0,
        error: "Adapter not started",
      };
    }
    const set = DeterministicP2PAdapter.handlers.get(toPeerId);
    if (!set || set.size === 0) {
      return {
        delivered: false,
        routeUsed: this.route,
        latencyMs: 0,
        relayHops: 0,
        error: "Peer offline",
      };
    }
    set.forEach((handler) => handler(packet, this.localPeerId));
    return {
      delivered: true,
      routeUsed: this.route,
      latencyMs: 10,
      relayHops: this.route === "Direct P2P" ? 0 : this.route === "2-hop Relay" ? 2 : 3,
      ackId: `ack-${packet.id}`,
    };
  }
}

function waitFor<T>(label: string, read: () => T | null, timeoutMs = 4000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const value = read();
      if (value !== null) {
        resolve(value);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timeout waiting for ${label}`));
        return;
      }
      setTimeout(tick, 25);
    };
    tick();
  });
}

async function runHandshakeDeliveryScenario(): Promise<void> {
  process.env.NAIER_MESSAGE_KEY = "test-shared-message-key-12345";
  DeterministicP2PAdapter.clear();

  const agreementA = await createLocalKeyAgreement("peer-a-fingerprint");
  const agreementB = await createLocalKeyAgreement("peer-b-fingerprint");
  const engineA = new MessengerEngine(
    establishSession("peer-a-fingerprint"),
    new DeterministicP2PAdapter(),
    "peer-a",
    agreementA,
  );
  const engineB = new MessengerEngine(
    establishSession("peer-b-fingerprint"),
    new DeterministicP2PAdapter(),
    "peer-b",
    agreementB,
  );

  const received: string[] = [];
  await engineA.start();
  await engineB.start();
  const unsubA = engineA.subscribeIncoming(() => {});
  const unsubB = engineB.subscribeIncoming((payload) => {
    received.push(payload.plaintext);
  });

  const sent = await engineA.sendMessage("chat-peer-b", "peer-b", "hello-secure-world", "Direct P2P");
  assert.equal(sent.delivery, "sent");
  assert.match(sent.cipherSuite ?? "", /\+ECDH-P256$/);

  const plaintext = await waitFor("message delivery", () => {
    const found = received.find((value) => value === "hello-secure-world");
    return found ?? null;
  });
  assert.equal(plaintext, "hello-secure-world");

  unsubA();
  unsubB();
  await engineA.stop();
  await engineB.stop();
}

async function runKeyRotationScenario(): Promise<void> {
  process.env.NAIER_MESSAGE_KEY = "test-shared-message-key-12345";
  DeterministicP2PAdapter.clear();

  const agreementA = await createLocalKeyAgreement("peer-a-fingerprint");
  const agreementB1 = await createLocalKeyAgreement("peer-b-fingerprint-v1");
  const engineA = new MessengerEngine(
    establishSession("peer-a-fingerprint"),
    new DeterministicP2PAdapter(),
    "peer-a",
    agreementA,
  );
  const engineB1 = new MessengerEngine(
    establishSession("peer-b-fingerprint"),
    new DeterministicP2PAdapter(),
    "peer-b",
    agreementB1,
  );

  const keyEvents: Array<{ status: "first_seen" | "changed"; keyId: string }> = [];
  await engineA.start();
  await engineB1.start();
  const unsubKeyEvents = engineA.subscribePeerKeyEvents((event) => {
    if (event.peerId === "peer-b") {
      keyEvents.push({ status: event.status, keyId: event.keyId });
    }
  });
  const unsubA = engineA.subscribeIncoming(() => {});
  const unsubB1 = engineB1.subscribeIncoming(() => {});

  await engineB1.sendMessage("chat-peer-a", "peer-a", "first-contact", "Direct P2P");
  await waitFor("first_seen key event", () =>
    keyEvents.some((event) => event.status === "first_seen") ? true : null,
  );

  unsubB1();
  await engineB1.stop();

  const agreementB2 = await createLocalKeyAgreement("peer-b-fingerprint-v2");
  const engineB2 = new MessengerEngine(
    establishSession("peer-b-fingerprint"),
    new DeterministicP2PAdapter(),
    "peer-b",
    agreementB2,
  );
  await engineB2.start();
  const unsubB2 = engineB2.subscribeIncoming(() => {});

  await engineB2.sendMessage("chat-peer-a", "peer-a", "rotated-key-contact", "Direct P2P");
  await waitFor("changed key event", () =>
    keyEvents.some((event) => event.status === "changed") ? true : null,
  );

  assert.ok(keyEvents.find((event) => event.status === "first_seen"));
  assert.ok(keyEvents.find((event) => event.status === "changed"));

  unsubKeyEvents();
  unsubA();
  unsubB2();
  await engineB2.stop();
  await engineA.stop();
}

async function runEncryptedAppStateScenario(): Promise<void> {
  process.env.NAIER_MESSAGE_KEY = "test-shared-message-key-12345";

  const seedState = {
    version: 1 as const,
    route: "2-hop Relay" as const,
    disappearPolicy: "1 h" as const,
    accentMode: "Cyber Blue" as const,
    messages: [
      {
        id: "msg-1",
        chatId: "chat-peer-z",
        text: "encrypted-state-test",
        fromMe: true,
        sentAtLabel: "10:00",
        delivery: "sent" as const,
      },
    ],
    chats: [
      {
        id: "chat-peer-z",
        name: "peer-z",
        lastMessage: "encrypted-state-test",
        timeLabel: "10:00",
        unread: 0,
        trust: "unverified" as const,
      },
    ],
    contacts: [
      {
        peerId: "peer-z",
        name: "peer-z",
        fingerprintPreview: "AAAA:BBBB:CCCC",
        online: true,
        trust: "unverified" as const,
      },
    ],
    securityPreferences: {
      biometricLock: true,
      screenshotBlock: true,
      antiDelete: true,
      preferDirectP2P: true,
      relayFallback: true,
    },
    contactRequests: [
      {
        peerId: "peer-y",
        name: "peer-y",
        direction: "outgoing" as const,
        createdAtIso: new Date().toISOString(),
      },
    ],
    blockedPeers: ["peer-blocked"],
  };

  await savePersistedAppState(seedState);
  const loaded = await loadPersistedAppState();
  assert.equal(loaded.route, "2-hop Relay");
  assert.equal(loaded.messages[0]?.text, "encrypted-state-test");
  assert.equal(loaded.contactRequests[0]?.peerId, "peer-y");

  const backupPayload = await exportEncryptedAppBackup(seedState);
  assert.ok(backupPayload.length > 24);
  const restored = await importEncryptedAppBackup(backupPayload);
  assert.ok(restored);
  assert.equal(restored?.contacts[0]?.peerId, "peer-z");
  assert.equal(restored?.blockedPeers.includes("peer-blocked"), true);
}

async function runIdentityPersistenceScenario(): Promise<void> {
  process.env.NAIER_MESSAGE_KEY = "test-shared-message-key-12345";

  const words = [
    "anchor",
    "apex",
    "arc",
    "ash",
    "atlas",
    "aurora",
    "binary",
    "black",
    "bloom",
    "bridge",
    "byte",
    "carbon",
  ];
  const identity = createIdentityProfile("Naier User", words);
  const agreement = await createLocalKeyAgreement(identity.publicFingerprint);
  const serializedAgreement = await serializeLocalKeyAgreement(agreement);

  await savePersistedIdentityState({
    version: 1,
    identity,
    keyAgreement: serializedAgreement,
  });

  const loaded = await loadPersistedIdentityState();
  assert.ok(loaded);
  assert.equal(loaded?.identity.publicFingerprint, identity.publicFingerprint);

  const restoredAgreement = await restoreLocalKeyAgreement(loaded?.keyAgreement ?? null);
  assert.ok(restoredAgreement);
  assert.equal(restoredAgreement?.keyId, agreement.keyId);
}

async function main(): Promise<void> {
  const scenarios = [
    { name: "handshake delivery", run: runHandshakeDeliveryScenario },
    { name: "key rotation event", run: runKeyRotationScenario },
    { name: "encrypted app-state persistence", run: runEncryptedAppStateScenario },
    { name: "identity persistence", run: runIdentityPersistenceScenario },
  ];
  for (const scenario of scenarios) {
    await scenario.run();
    process.stdout.write(`PASS: ${scenario.name}\n`);
  }
}

void main().catch((error) => {
  process.stderr.write(`FAIL: ${(error as Error).message}\n`);
  process.exitCode = 1;
});
