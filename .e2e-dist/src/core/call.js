"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockWebRTCCallAdapter = void 0;
const transport_1 = require("./transport");
function nextJitter(route) {
    if (route === "Direct P2P")
        return 2 + Math.floor(Math.random() * 5);
    if (route === "2-hop Relay")
        return 5 + Math.floor(Math.random() * 7);
    return 7 + Math.floor(Math.random() * 10);
}
function nextLoss(route) {
    if (route === "Direct P2P")
        return 0.2 + Math.random() * 0.6;
    if (route === "2-hop Relay")
        return 0.4 + Math.random() * 0.8;
    return 0.8 + Math.random() * 1.2;
}
function createBaseState() {
    const status = (0, transport_1.getRouteStatus)("Direct P2P");
    return {
        phase: "idle",
        mode: "voice",
        peerId: null,
        route: "Direct P2P",
        encrypted: true,
        muted: false,
        cameraEnabled: true,
        speakerEnabled: true,
        latencyMs: status.latencyMs,
        bars: status.bars,
        jitterMs: 0,
        packetLossPct: 0,
        durationSec: 0,
    };
}
class MockWebRTCCallAdapter {
    constructor() {
        this.state = createBaseState();
        this.listeners = new Set();
        this.callTimer = null;
        this.connectTimer = null;
    }
    getState() {
        return { ...this.state };
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getState());
        return () => {
            this.listeners.delete(listener);
        };
    }
    async startCall(peerId, mode, route) {
        this.clearTimers();
        const status = (0, transport_1.getRouteStatus)(route);
        this.state = {
            ...this.state,
            phase: "connecting",
            mode,
            peerId,
            route,
            latencyMs: status.latencyMs,
            bars: status.bars,
            jitterMs: nextJitter(route),
            packetLossPct: nextLoss(route),
            durationSec: 0,
            reason: undefined,
        };
        this.emit();
        this.connectTimer = setTimeout(() => {
            const refreshed = (0, transport_1.getRouteStatus)(route);
            this.state = {
                ...this.state,
                phase: "connected",
                latencyMs: refreshed.latencyMs,
                bars: refreshed.bars,
            };
            this.emit();
            this.callTimer = setInterval(() => {
                const dynamic = (0, transport_1.getRouteStatus)(this.state.route);
                this.state = {
                    ...this.state,
                    durationSec: this.state.durationSec + 1,
                    latencyMs: dynamic.latencyMs,
                    bars: dynamic.bars,
                    jitterMs: nextJitter(this.state.route),
                    packetLossPct: nextLoss(this.state.route),
                };
                this.emit();
            }, 1000);
        }, 700);
    }
    async endCall(reason = "local_end") {
        this.clearTimers();
        this.state = {
            ...this.state,
            phase: "ended",
            reason,
        };
        this.emit();
    }
    toggleMute() {
        this.state = {
            ...this.state,
            muted: !this.state.muted,
        };
        this.emit();
    }
    toggleCamera() {
        this.state = {
            ...this.state,
            cameraEnabled: !this.state.cameraEnabled,
        };
        this.emit();
    }
    toggleSpeaker() {
        this.state = {
            ...this.state,
            speakerEnabled: !this.state.speakerEnabled,
        };
        this.emit();
    }
    switchRoute(route) {
        const status = (0, transport_1.getRouteStatus)(route);
        this.state = {
            ...this.state,
            route,
            latencyMs: status.latencyMs,
            bars: status.bars,
            jitterMs: nextJitter(route),
            packetLossPct: nextLoss(route),
        };
        this.emit();
    }
    dispose() {
        this.clearTimers();
        this.listeners.clear();
    }
    emit() {
        const snapshot = this.getState();
        this.listeners.forEach((listener) => listener(snapshot));
    }
    clearTimers() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        if (this.connectTimer) {
            clearTimeout(this.connectTimer);
            this.connectTimer = null;
        }
    }
}
exports.MockWebRTCCallAdapter = MockWebRTCCallAdapter;
