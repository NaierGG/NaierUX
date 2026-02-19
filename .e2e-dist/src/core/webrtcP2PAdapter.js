"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebRTCP2PAdapter = void 0;
exports.isWebRTCSupported = isWebRTCSupported;
const transport_1 = require("./transport");
function runtimeEnv(name) {
    try {
        const envObj = globalThis?.process?.env;
        const direct = envObj?.[name];
        if (typeof direct === "string" && direct.length > 0) {
            return direct;
        }
        const expoPublic = envObj?.[`EXPO_PUBLIC_${name}`];
        if (typeof expoPublic === "string" && expoPublic.length > 0) {
            return expoPublic;
        }
    }
    catch {
        // Ignore env read errors.
    }
    return undefined;
}
function parseCsv(value) {
    if (!value) {
        return [];
    }
    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}
function getRTCPeerConnectionCtor() {
    return globalThis.RTCPeerConnection;
}
function getRTCSessionDescriptionCtor() {
    return globalThis.RTCSessionDescription;
}
function getRTCIceCandidateCtor() {
    return globalThis.RTCIceCandidate;
}
function randomId(prefix) {
    const rand = Math.floor(Math.random() * 1_000_000)
        .toString(16)
        .padStart(6, "0");
    return `${prefix}-${Date.now()}-${rand}`;
}
function isWebRTCSupported() {
    return typeof getRTCPeerConnectionCtor() === "function";
}
function defaultRtcConfig() {
    const configuredStun = parseCsv(runtimeEnv("NAIER_STUN_URLS"));
    const stunUrls = configuredStun.length > 0
        ? configuredStun
        : [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
        ];
    const turnUrls = parseCsv(runtimeEnv("NAIER_TURN_URLS"));
    const turnUsername = runtimeEnv("NAIER_TURN_USERNAME");
    const turnCredential = runtimeEnv("NAIER_TURN_CREDENTIAL");
    const iceServers = [
        ...stunUrls.map((url) => ({ urls: url })),
    ];
    if (turnUrls.length > 0 && turnUsername && turnCredential) {
        iceServers.push({
            urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
            username: turnUsername,
            credential: turnCredential,
        });
    }
    return {
        iceServers,
    };
}
class WebRTCP2PAdapter {
    constructor(signalingAdapter, optionsOrRtcConfig = {}) {
        this.name = "WebRTCP2PAdapter";
        this.route = "Direct P2P";
        this.localPeerId = "";
        this.started = false;
        this.listeners = new Set();
        this.peers = new Map();
        this.reconnectAttempts = new Map();
        this.reconnectTimers = new Map();
        this.unsubscribeSignal = null;
        this.signaling = signalingAdapter;
        const normalizedOptions = "rtcConfig" in optionsOrRtcConfig
            ? optionsOrRtcConfig
            : { rtcConfig: optionsOrRtcConfig };
        this.baseRtcConfig = normalizedOptions.rtcConfig ?? defaultRtcConfig();
        this.reconnectMaxAttempts = normalizedOptions.reconnectMaxAttempts ?? 5;
        this.reconnectBaseDelayMs = normalizedOptions.reconnectBaseDelayMs ?? 350;
        this.candidatePolicyByRoute = {
            "Direct P2P": "all",
            "2-hop Relay": "all",
            Tor: "relay",
            ...(normalizedOptions.candidatePolicyByRoute ?? {}),
        };
        this.renegotiateOnRouteSwitch = normalizedOptions.renegotiateOnRouteSwitch ?? true;
    }
    async start(localPeerId) {
        if (!isWebRTCSupported()) {
            throw new Error("WebRTC runtime is not supported in this environment.");
        }
        if (this.started) {
            return;
        }
        this.localPeerId = localPeerId;
        await this.signaling.start(localPeerId);
        this.unsubscribeSignal = this.signaling.subscribe((envelope) => {
            void this.handleSignal(envelope);
        });
        this.started = true;
    }
    async stop() {
        if (!this.started) {
            return;
        }
        this.unsubscribeSignal?.();
        this.unsubscribeSignal = null;
        this.clearReconnectTimers();
        for (const peerId of this.peers.keys()) {
            this.closePeer(peerId, true);
        }
        this.peers.clear();
        this.reconnectAttempts.clear();
        await this.signaling.stop();
        this.listeners.clear();
        this.localPeerId = "";
        this.started = false;
    }
    setRoute(route) {
        const previousRoute = this.route;
        this.route = route;
        if (this.renegotiateOnRouteSwitch && previousRoute !== route) {
            this.restartAllPeers("route_switch");
        }
    }
    getRoute() {
        return this.route;
    }
    getRouteStatus() {
        return (0, transport_1.getRouteStatus)(this.route);
    }
    nextFallbackRoute(route) {
        return (0, transport_1.fallbackRoute)(route);
    }
    subscribePackets(handler) {
        this.listeners.add(handler);
        return () => {
            this.listeners.delete(handler);
        };
    }
    async sendPacket(packet, toPeerId) {
        if (!this.started) {
            return {
                delivered: false,
                routeUsed: this.route,
                latencyMs: 0,
                relayHops: this.route === "Direct P2P" ? 0 : this.route === "2-hop Relay" ? 2 : 3,
                error: "WebRTC adapter is not started.",
            };
        }
        const status = this.getRouteStatus();
        try {
            const ctx = await this.ensureOpenChannel(toPeerId);
            const envelope = JSON.stringify({
                kind: "naier_packet",
                fromPeerId: this.localPeerId,
                packet,
            });
            ctx.channel?.send(envelope);
            return {
                delivered: true,
                routeUsed: this.route,
                latencyMs: status.latencyMs,
                relayHops: this.route === "Direct P2P" ? 0 : this.route === "2-hop Relay" ? 2 : 3,
                ackId: `ack-${packet.id}`,
            };
        }
        catch (error) {
            this.scheduleReconnect(toPeerId, "send_failure");
            return {
                delivered: false,
                routeUsed: this.route,
                latencyMs: status.latencyMs,
                relayHops: this.route === "Direct P2P" ? 0 : this.route === "2-hop Relay" ? 2 : 3,
                error: error instanceof Error ? error.message : "Unknown WebRTC send error.",
            };
        }
    }
    buildRtcConfigForRoute(route) {
        const policy = this.candidatePolicyByRoute[route];
        return {
            ...this.baseRtcConfig,
            iceTransportPolicy: policy,
        };
    }
    ensurePeerContext(peerId, initiator) {
        const existing = this.peers.get(peerId);
        if (existing && existing.pc?.connectionState !== "closed") {
            return existing;
        }
        if (existing) {
            this.closePeer(peerId, true);
        }
        const RTCPeerConnectionCtor = getRTCPeerConnectionCtor();
        if (!RTCPeerConnectionCtor) {
            throw new Error("RTCPeerConnection is unavailable.");
        }
        const config = this.buildRtcConfigForRoute(this.route);
        const pc = new RTCPeerConnectionCtor(config);
        let resolveReady = () => { };
        let rejectReady = (_reason) => { };
        const readyPromise = new Promise((resolve, reject) => {
            resolveReady = resolve;
            rejectReady = reject;
        });
        const ctx = {
            peerId,
            sessionId: randomId("rtc"),
            pc,
            channel: null,
            readyPromise,
            resolveReady,
            rejectReady,
            initiator,
            closedByLocal: false,
        };
        pc.onicecandidate = (event) => {
            if (!event?.candidate) {
                return;
            }
            void this.signaling.sendSignal({
                id: randomId("sig"),
                fromPeerId: this.localPeerId,
                toPeerId: peerId,
                sessionId: ctx.sessionId,
                type: "ice",
                payload: event.candidate,
                createdAtIso: new Date().toISOString(),
            });
        };
        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            if (state === "failed" || state === "disconnected") {
                this.scheduleReconnect(peerId, `ice_${state}`);
            }
        };
        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            if (state === "connected") {
                this.reconnectAttempts.set(peerId, 0);
                return;
            }
            if (state === "failed" || state === "disconnected") {
                ctx.rejectReady(new Error(`Peer connection state: ${state}`));
                this.scheduleReconnect(peerId, `pc_${state}`);
            }
            if (state === "closed") {
                ctx.rejectReady(new Error("Peer connection closed"));
            }
        };
        if (initiator) {
            const channel = pc.createDataChannel("naier-packets", {
                ordered: true,
            });
            this.attachDataChannel(ctx, channel);
        }
        else {
            pc.ondatachannel = (event) => {
                this.attachDataChannel(ctx, event.channel);
            };
        }
        this.peers.set(peerId, ctx);
        return ctx;
    }
    attachDataChannel(ctx, channel) {
        ctx.channel = channel;
        channel.onopen = () => {
            ctx.resolveReady();
            this.reconnectAttempts.set(ctx.peerId, 0);
        };
        channel.onmessage = (event) => {
            this.handleDataMessage(ctx.peerId, event.data);
        };
        channel.onerror = () => {
            ctx.rejectReady(new Error("RTCDataChannel error"));
            this.scheduleReconnect(ctx.peerId, "channel_error");
        };
        channel.onclose = () => {
            if (!ctx.closedByLocal) {
                ctx.rejectReady(new Error("RTCDataChannel closed"));
                this.scheduleReconnect(ctx.peerId, "channel_closed");
            }
        };
    }
    async ensureOpenChannel(peerId) {
        const ctx = this.ensurePeerContext(peerId, true);
        if (!ctx.pc.localDescription && (!ctx.channel || ctx.channel.readyState !== "open")) {
            await this.sendOffer(ctx);
        }
        await Promise.race([
            ctx.readyPromise,
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Timed out waiting for RTCDataChannel open.")), 7000);
            }),
        ]);
        if (!ctx.channel || ctx.channel.readyState !== "open") {
            throw new Error("RTCDataChannel is not open.");
        }
        return ctx;
    }
    async sendOffer(ctx) {
        const offer = await ctx.pc.createOffer({
            iceRestart: ctx.pc.iceConnectionState === "failed" || ctx.pc.iceConnectionState === "disconnected",
        });
        await ctx.pc.setLocalDescription(offer);
        await this.signaling.sendSignal({
            id: randomId("sig"),
            fromPeerId: this.localPeerId,
            toPeerId: ctx.peerId,
            sessionId: ctx.sessionId,
            type: "offer",
            payload: ctx.pc.localDescription,
            createdAtIso: new Date().toISOString(),
        });
    }
    async handleSignal(envelope) {
        if (!this.started) {
            return;
        }
        if (envelope.toPeerId !== this.localPeerId) {
            return;
        }
        if (envelope.type === "hangup") {
            this.closePeer(envelope.fromPeerId, true);
            return;
        }
        if (envelope.type === "bootstrap") {
            return;
        }
        const ctx = this.ensurePeerContext(envelope.fromPeerId, false);
        const RTCSessionDescriptionCtor = getRTCSessionDescriptionCtor();
        const RTCIceCandidateCtor = getRTCIceCandidateCtor();
        if (envelope.type === "offer") {
            const remoteDescription = RTCSessionDescriptionCtor
                ? new RTCSessionDescriptionCtor(envelope.payload)
                : envelope.payload;
            await ctx.pc.setRemoteDescription(remoteDescription);
            const answer = await ctx.pc.createAnswer();
            await ctx.pc.setLocalDescription(answer);
            await this.signaling.sendSignal({
                id: randomId("sig"),
                fromPeerId: this.localPeerId,
                toPeerId: envelope.fromPeerId,
                sessionId: ctx.sessionId,
                type: "answer",
                payload: ctx.pc.localDescription,
                createdAtIso: new Date().toISOString(),
            });
            return;
        }
        if (envelope.type === "answer") {
            const remoteDescription = RTCSessionDescriptionCtor
                ? new RTCSessionDescriptionCtor(envelope.payload)
                : envelope.payload;
            await ctx.pc.setRemoteDescription(remoteDescription);
            return;
        }
        if (envelope.type === "ice") {
            const candidate = RTCIceCandidateCtor
                ? new RTCIceCandidateCtor(envelope.payload)
                : envelope.payload;
            try {
                await ctx.pc.addIceCandidate(candidate);
            }
            catch {
                // Ignore stale ICE candidates.
            }
        }
    }
    handleDataMessage(fromPeerId, payload) {
        let parsed = payload;
        if (typeof payload === "string") {
            try {
                parsed = JSON.parse(payload);
            }
            catch {
                return;
            }
        }
        if (!parsed || parsed.kind !== "naier_packet" || !parsed.packet) {
            return;
        }
        this.listeners.forEach((listener) => {
            listener(parsed.packet, parsed.fromPeerId ?? fromPeerId);
        });
    }
    scheduleReconnect(peerId, _reason) {
        if (!this.started) {
            return;
        }
        if (this.reconnectTimers.has(peerId)) {
            return;
        }
        const attempts = this.reconnectAttempts.get(peerId) ?? 0;
        if (attempts >= this.reconnectMaxAttempts) {
            return;
        }
        const delay = Math.min(7000, this.reconnectBaseDelayMs * Math.pow(2, attempts));
        this.reconnectAttempts.set(peerId, attempts + 1);
        const timer = setTimeout(() => {
            this.reconnectTimers.delete(peerId);
            void this.restartPeer(peerId);
        }, delay);
        this.reconnectTimers.set(peerId, timer);
    }
    async restartPeer(peerId) {
        if (!this.started) {
            return;
        }
        this.closePeer(peerId, true);
        try {
            await this.ensureOpenChannel(peerId);
        }
        catch {
            this.scheduleReconnect(peerId, "restart_failed");
        }
    }
    restartAllPeers(_reason) {
        for (const peerId of this.peers.keys()) {
            this.scheduleReconnect(peerId, "route_switch");
        }
    }
    closePeer(peerId, localClose) {
        const ctx = this.peers.get(peerId);
        if (!ctx) {
            return;
        }
        ctx.closedByLocal = localClose;
        try {
            ctx.channel?.close?.();
        }
        catch {
            // Ignore close errors.
        }
        try {
            ctx.pc?.close?.();
        }
        catch {
            // Ignore close errors.
        }
        this.peers.delete(peerId);
    }
    clearReconnectTimers() {
        for (const timer of this.reconnectTimers.values()) {
            clearTimeout(timer);
        }
        this.reconnectTimers.clear();
    }
}
exports.WebRTCP2PAdapter = WebRTCP2PAdapter;
