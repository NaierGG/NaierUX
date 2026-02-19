"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const messengerEngine_1 = require("../../src/core/messengerEngine");
const crypto_1 = require("../../src/core/crypto");
class DeterministicP2PAdapter {
    constructor() {
        this.name = "DeterministicP2PAdapter";
        this.localPeerId = "";
        this.route = "Direct P2P";
        this.started = false;
    }
    static clear() {
        this.handlers.clear();
    }
    async start(localPeerId) {
        this.localPeerId = localPeerId;
        this.started = true;
        if (!DeterministicP2PAdapter.handlers.has(localPeerId)) {
            DeterministicP2PAdapter.handlers.set(localPeerId, new Set());
        }
    }
    async stop() {
        if (this.localPeerId) {
            DeterministicP2PAdapter.handlers.delete(this.localPeerId);
        }
        this.localPeerId = "";
        this.started = false;
    }
    setRoute(route) {
        this.route = route;
    }
    getRoute() {
        return this.route;
    }
    getRouteStatus() {
        return {
            route: this.route,
            bars: 5,
            latencyMs: 10,
            label: "deterministic",
        };
    }
    nextFallbackRoute(route) {
        if (route === "Direct P2P")
            return "2-hop Relay";
        if (route === "2-hop Relay")
            return "Tor";
        return "2-hop Relay";
    }
    subscribePackets(handler) {
        if (!this.localPeerId) {
            return () => { };
        }
        const set = DeterministicP2PAdapter.handlers.get(this.localPeerId);
        if (!set) {
            return () => { };
        }
        set.add(handler);
        return () => {
            set.delete(handler);
        };
    }
    async sendPacket(packet, toPeerId) {
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
DeterministicP2PAdapter.handlers = new Map();
function waitFor(label, read, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
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
(0, node_test_1.default)("handshake reaches secure and delivers user payload with ECDH cipher suffix", async () => {
    process.env.NAIER_MESSAGE_KEY = "test-shared-message-key-12345";
    DeterministicP2PAdapter.clear();
    const agreementA = await (0, crypto_1.createLocalKeyAgreement)("peer-a-fingerprint");
    const agreementB = await (0, crypto_1.createLocalKeyAgreement)("peer-b-fingerprint");
    const engineA = new messengerEngine_1.MessengerEngine((0, crypto_1.establishSession)("peer-a-fingerprint"), new DeterministicP2PAdapter(), "peer-a", agreementA);
    const engineB = new messengerEngine_1.MessengerEngine((0, crypto_1.establishSession)("peer-b-fingerprint"), new DeterministicP2PAdapter(), "peer-b", agreementB);
    const received = [];
    await engineA.start();
    await engineB.start();
    const unsubA = engineA.subscribeIncoming(() => { });
    const unsubB = engineB.subscribeIncoming((payload) => {
        received.push(payload.plaintext);
    });
    const sent = await engineA.sendMessage("chat-peer-b", "peer-b", "hello-secure-world", "Direct P2P");
    strict_1.default.equal(sent.delivery, "sent");
    strict_1.default.match(sent.cipherSuite ?? "", /\+ECDH-P256$/);
    const plaintext = await waitFor("message delivery", () => {
        const found = received.find((value) => value === "hello-secure-world");
        return found ?? null;
    });
    strict_1.default.equal(plaintext, "hello-secure-world");
    unsubA();
    unsubB();
    await engineA.stop();
    await engineB.stop();
});
(0, node_test_1.default)("peer key rotation emits changed event", async () => {
    process.env.NAIER_MESSAGE_KEY = "test-shared-message-key-12345";
    DeterministicP2PAdapter.clear();
    const agreementA = await (0, crypto_1.createLocalKeyAgreement)("peer-a-fingerprint");
    const agreementB1 = await (0, crypto_1.createLocalKeyAgreement)("peer-b-fingerprint-v1");
    const engineA = new messengerEngine_1.MessengerEngine((0, crypto_1.establishSession)("peer-a-fingerprint"), new DeterministicP2PAdapter(), "peer-a", agreementA);
    const engineB1 = new messengerEngine_1.MessengerEngine((0, crypto_1.establishSession)("peer-b-fingerprint"), new DeterministicP2PAdapter(), "peer-b", agreementB1);
    const keyEvents = [];
    await engineA.start();
    await engineB1.start();
    const unsubKeyEvents = engineA.subscribePeerKeyEvents((event) => {
        if (event.peerId === "peer-b") {
            keyEvents.push({ status: event.status, keyId: event.keyId });
        }
    });
    const unsubA = engineA.subscribeIncoming(() => { });
    const unsubB1 = engineB1.subscribeIncoming(() => { });
    await engineB1.sendMessage("chat-peer-a", "peer-a", "first-contact", "Direct P2P");
    await waitFor("first_seen key event", () => keyEvents.some((event) => event.status === "first_seen") ? true : null);
    unsubB1();
    await engineB1.stop();
    const agreementB2 = await (0, crypto_1.createLocalKeyAgreement)("peer-b-fingerprint-v2");
    const engineB2 = new messengerEngine_1.MessengerEngine((0, crypto_1.establishSession)("peer-b-fingerprint"), new DeterministicP2PAdapter(), "peer-b", agreementB2);
    await engineB2.start();
    const unsubB2 = engineB2.subscribeIncoming(() => { });
    await engineB2.sendMessage("chat-peer-a", "peer-a", "rotated-key-contact", "Direct P2P");
    await waitFor("changed key event", () => keyEvents.some((event) => event.status === "changed") ? true : null);
    strict_1.default.ok(keyEvents.find((event) => event.status === "first_seen"));
    strict_1.default.ok(keyEvents.find((event) => event.status === "changed"));
    unsubKeyEvents();
    unsubA();
    unsubB2();
    await engineB2.stop();
    await engineA.stop();
});
