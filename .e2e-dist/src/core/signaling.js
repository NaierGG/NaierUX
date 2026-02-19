"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticatedWebSocketSignalingAdapter = exports.InMemorySignalingAdapter = void 0;
function getCryptoObject() {
    return globalThis.crypto;
}
function toHex(bytes) {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}
function utf8Encode(value) {
    if (typeof TextEncoder !== "undefined") {
        return new TextEncoder().encode(value);
    }
    const escaped = unescape(encodeURIComponent(value));
    const bytes = new Uint8Array(escaped.length);
    for (let i = 0; i < escaped.length; i += 1) {
        bytes[i] = escaped.charCodeAt(i);
    }
    return bytes;
}
function randomHex(lengthBytes) {
    const cryptoObject = getCryptoObject();
    if (cryptoObject?.getRandomValues) {
        return toHex(cryptoObject.getRandomValues(new Uint8Array(lengthBytes)));
    }
    let out = "";
    for (let i = 0; i < lengthBytes; i += 1) {
        out += Math.floor(Math.random() * 256)
            .toString(16)
            .padStart(2, "0");
    }
    return out;
}
function canonicalSignalPayload(envelope) {
    return JSON.stringify({
        id: envelope.id,
        fromPeerId: envelope.fromPeerId,
        toPeerId: envelope.toPeerId,
        sessionId: envelope.sessionId,
        type: envelope.type,
        payload: envelope.payload,
        createdAtIso: envelope.createdAtIso,
        route: envelope.route,
    });
}
function tinyDigest(payload) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < payload.length; i += 1) {
        hash ^= payload.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}
async function hmacSign(secret, payload) {
    const cryptoObject = getCryptoObject();
    if (cryptoObject?.subtle) {
        const key = await cryptoObject.subtle.importKey("raw", utf8Encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const signature = await cryptoObject.subtle.sign("HMAC", key, utf8Encode(payload));
        return toHex(new Uint8Array(signature));
    }
    return tinyDigest(`${secret}|${payload}`);
}
async function signEnvelope(envelope, authToken, keyId) {
    const nonce = randomHex(8);
    const canonical = canonicalSignalPayload(envelope);
    const signature = await hmacSign(authToken, `${nonce}|${canonical}`);
    return {
        ...envelope,
        auth: {
            keyId,
            nonce,
            signature,
        },
    };
}
function randomRelayId(prefix = "relay") {
    return `${prefix}-${randomHex(2)}`;
}
async function createOnionRoute(fromPeerId, toPeerId, mode, authToken) {
    const hops = mode === "direct"
        ? [fromPeerId, toPeerId]
        : mode === "relay2"
            ? [fromPeerId, randomRelayId("hop"), randomRelayId("hop"), toPeerId]
            : [fromPeerId, randomRelayId("tor"), randomRelayId("tor"), randomRelayId("tor"), toPeerId];
    const issuedAtIso = new Date().toISOString();
    const signature = await hmacSign(authToken, `${mode}|${hops.join(">")}|${issuedAtIso}`);
    return {
        mode,
        hops,
        issuedAtIso,
        signature,
    };
}
const SIGNAL_BUS = new Map();
function ensureBus(namespace) {
    let scopedBus = SIGNAL_BUS.get(namespace);
    if (!scopedBus) {
        scopedBus = new Map();
        SIGNAL_BUS.set(namespace, scopedBus);
    }
    return scopedBus;
}
function ensurePeerHandlers(namespace, peerId) {
    const scopedBus = ensureBus(namespace);
    let handlers = scopedBus.get(peerId);
    if (!handlers) {
        handlers = new Set();
        scopedBus.set(peerId, handlers);
    }
    return handlers;
}
class InMemorySignalingAdapter {
    constructor(options = {}) {
        this.name = "InMemorySignalingAdapter";
        this.localPeerId = "";
        this.handlers = new Set();
        this.namespace = options.namespace ?? "naier-default-signaling";
        this.authToken = options.authToken ?? "dev-signaling-secret";
        this.keyId = options.keyId ?? "naier-dev-key";
        this.onionMode = options.onionMode ?? "relay2";
    }
    async start(localPeerId) {
        this.localPeerId = localPeerId;
        ensurePeerHandlers(this.namespace, localPeerId);
    }
    async stop() {
        if (this.localPeerId) {
            const scopedBus = ensureBus(this.namespace);
            scopedBus.delete(this.localPeerId);
        }
        this.localPeerId = "";
        this.handlers.clear();
    }
    subscribe(handler) {
        this.handlers.add(handler);
        if (this.localPeerId) {
            const peerHandlers = ensurePeerHandlers(this.namespace, this.localPeerId);
            peerHandlers.add(handler);
        }
        return () => {
            this.handlers.delete(handler);
            if (this.localPeerId) {
                const scopedBus = ensureBus(this.namespace);
                const peerHandlers = scopedBus.get(this.localPeerId);
                peerHandlers?.delete(handler);
            }
        };
    }
    async sendSignal(envelope) {
        const scopedBus = ensureBus(this.namespace);
        const targetHandlers = scopedBus.get(envelope.toPeerId);
        if (!targetHandlers || targetHandlers.size === 0) {
            return;
        }
        const withRoute = {
            ...envelope,
            route: envelope.route ??
                (await createOnionRoute(envelope.fromPeerId, envelope.toPeerId, this.onionMode, this.authToken)),
        };
        const signed = await signEnvelope(withRoute, this.authToken, this.keyId);
        targetHandlers.forEach((handler) => {
            Promise.resolve().then(() => handler(signed));
        });
    }
}
exports.InMemorySignalingAdapter = InMemorySignalingAdapter;
function getWebSocketCtor() {
    return globalThis.WebSocket;
}
function defaultWebSocketFactory(url) {
    const Ctor = getWebSocketCtor();
    if (!Ctor) {
        throw new Error("WebSocket runtime is unavailable.");
    }
    return new Ctor(url);
}
class AuthenticatedWebSocketSignalingAdapter {
    constructor(options) {
        this.name = "AuthenticatedWebSocketSignalingAdapter";
        this.localPeerId = "";
        this.socket = null;
        this.handlers = new Set();
        this.pending = [];
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.started = false;
        this.url = options.url;
        this.authToken = options.authToken;
        this.namespace = options.namespace ?? "naier-signal";
        this.keyId = options.keyId ?? "naier-prod-key";
        this.onionMode = options.onionMode ?? "tor";
        this.websocketFactory = options.websocketFactory ?? defaultWebSocketFactory;
    }
    async start(localPeerId) {
        this.localPeerId = localPeerId;
        this.started = true;
        await this.connect();
    }
    async stop() {
        this.started = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            try {
                this.socket.onopen = null;
                this.socket.onmessage = null;
                this.socket.onerror = null;
                this.socket.onclose = null;
                this.socket.close();
            }
            catch {
                // Ignore close errors.
            }
        }
        this.socket = null;
        this.pending = [];
        this.handlers.clear();
    }
    subscribe(handler) {
        this.handlers.add(handler);
        return () => {
            this.handlers.delete(handler);
        };
    }
    async sendSignal(envelope) {
        const withRoute = {
            ...envelope,
            route: envelope.route ??
                (await createOnionRoute(envelope.fromPeerId, envelope.toPeerId, this.onionMode, this.authToken)),
        };
        const signed = await signEnvelope(withRoute, this.authToken, this.keyId);
        const message = {
            type: "signal",
            namespace: this.namespace,
            peerId: this.localPeerId,
            envelope: signed,
        };
        if (!this.socket || this.socket.readyState !== 1) {
            this.pending.push(message);
            if (this.started) {
                await this.connect();
            }
            return;
        }
        this.socket.send(JSON.stringify(message));
    }
    async connect() {
        if (!this.started) {
            return;
        }
        if (this.socket && (this.socket.readyState === 0 || this.socket.readyState === 1)) {
            return;
        }
        const token = encodeURIComponent(this.authToken);
        const peerId = encodeURIComponent(this.localPeerId);
        const namespace = encodeURIComponent(this.namespace);
        const wsUrl = `${this.url}?peerId=${peerId}&ns=${namespace}&token=${token}`;
        const socket = this.websocketFactory(wsUrl);
        this.socket = socket;
        socket.onopen = () => {
            this.reconnectAttempts = 0;
            const bootstrapEnvelope = {
                id: `bootstrap-${Date.now()}`,
                fromPeerId: this.localPeerId,
                toPeerId: this.localPeerId,
                sessionId: "bootstrap",
                type: "bootstrap",
                payload: {
                    namespace: this.namespace,
                },
                createdAtIso: new Date().toISOString(),
            };
            void signEnvelope(bootstrapEnvelope, this.authToken, this.keyId).then((signed) => {
                socket.send(JSON.stringify({
                    type: "bootstrap",
                    namespace: this.namespace,
                    peerId: this.localPeerId,
                    envelope: signed,
                }));
            });
            this.flushPending();
        };
        socket.onmessage = (event) => {
            try {
                const payload = JSON.parse(String(event.data));
                if (payload.type !== "signal" || !payload.envelope) {
                    return;
                }
                this.handlers.forEach((handler) => handler(payload.envelope));
            }
            catch {
                // Ignore malformed signal frames.
            }
        };
        socket.onerror = () => {
            // onclose handles reconnect logic.
        };
        socket.onclose = () => {
            if (!this.started) {
                return;
            }
            this.scheduleReconnect();
        };
    }
    flushPending() {
        if (!this.socket || this.socket.readyState !== 1) {
            return;
        }
        while (this.pending.length > 0) {
            const message = this.pending.shift();
            this.socket.send(JSON.stringify(message));
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }
        const delay = Math.min(5000, 400 * Math.pow(2, Math.min(this.reconnectAttempts, 5)));
        this.reconnectAttempts += 1;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.connect();
        }, delay);
    }
}
exports.AuthenticatedWebSocketSignalingAdapter = AuthenticatedWebSocketSignalingAdapter;
