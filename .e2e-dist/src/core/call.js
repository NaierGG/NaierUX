"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebRTCCallAdapter = exports.MockWebRTCCallAdapter = exports.DisabledCallAdapter = void 0;
exports.isCallRuntimeSupported = isCallRuntimeSupported;
const transport_1 = require("./transport");
function nowRouteMetrics(route) {
    const status = (0, transport_1.getRouteStatus)(route);
    const jitterMs = route === "Direct P2P"
        ? 2 + Math.floor(Math.random() * 5)
        : route === "2-hop Relay"
            ? 5 + Math.floor(Math.random() * 8)
            : 8 + Math.floor(Math.random() * 11);
    const packetLossPct = route === "Direct P2P"
        ? 0.2 + Math.random() * 0.7
        : route === "2-hop Relay"
            ? 0.4 + Math.random() * 1.0
            : 0.8 + Math.random() * 1.3;
    return {
        latencyMs: status.latencyMs,
        bars: status.bars,
        jitterMs,
        packetLossPct,
    };
}
function createBaseState() {
    const metrics = nowRouteMetrics("Direct P2P");
    return {
        phase: "idle",
        mode: "voice",
        peerId: null,
        route: "Direct P2P",
        encrypted: true,
        muted: false,
        cameraEnabled: true,
        speakerEnabled: true,
        latencyMs: metrics.latencyMs,
        bars: metrics.bars,
        jitterMs: 0,
        packetLossPct: 0,
        durationSec: 0,
    };
}
function randomId(prefix) {
    const rand = Math.floor(Math.random() * 1_000_000)
        .toString(16)
        .padStart(6, "0");
    return `${prefix}-${Date.now()}-${rand}`;
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
function getMediaDevices() {
    return globalThis?.navigator?.mediaDevices;
}
function isCallRuntimeSupported() {
    const peerConnectionCtor = getRTCPeerConnectionCtor();
    const mediaDevices = getMediaDevices();
    return (typeof peerConnectionCtor === "function" &&
        mediaDevices &&
        typeof mediaDevices.getUserMedia === "function");
}
class DisabledCallAdapter {
    constructor(reason) {
        this.reason = reason;
        this.listeners = new Set();
        this.state = {
            ...createBaseState(),
            phase: "failed",
            reason,
        };
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
    async startCall(_peerId, _mode, _route) {
        this.state = {
            ...this.state,
            phase: "failed",
            reason: this.reason,
        };
        this.emit();
    }
    async endCall(reason = "disabled") {
        this.state = {
            ...this.state,
            phase: "ended",
            reason,
        };
        this.emit();
    }
    toggleMute() { }
    toggleCamera() { }
    toggleSpeaker() { }
    switchRoute(route) {
        const metrics = nowRouteMetrics(route);
        this.state = {
            ...this.state,
            route,
            ...metrics,
        };
        this.emit();
    }
    dispose() {
        this.listeners.clear();
    }
    emit() {
        const snapshot = this.getState();
        this.listeners.forEach((listener) => listener(snapshot));
    }
}
exports.DisabledCallAdapter = DisabledCallAdapter;
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
        const metrics = nowRouteMetrics(route);
        this.state = {
            ...this.state,
            phase: "connecting",
            mode,
            peerId,
            route,
            ...metrics,
            durationSec: 0,
            reason: undefined,
        };
        this.emit();
        this.connectTimer = setTimeout(() => {
            this.state = {
                ...this.state,
                phase: "connected",
            };
            this.emit();
            this.callTimer = setInterval(() => {
                this.state = {
                    ...this.state,
                    ...nowRouteMetrics(this.state.route),
                    durationSec: this.state.durationSec + 1,
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
        this.state = {
            ...this.state,
            route,
            ...nowRouteMetrics(route),
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
class WebRTCCallAdapter {
    constructor(signaling, localPeerId, options = {}) {
        this.signaling = signaling;
        this.localPeerId = localPeerId;
        this.state = createBaseState();
        this.listeners = new Set();
        this.signalingStarted = false;
        this.unsubscribeSignal = null;
        this.connection = null;
        this.dataChannel = null;
        this.localStream = null;
        this.remoteStream = null;
        this.callTimer = null;
        this.activeSessionId = null;
        this.activePeerId = null;
        this.rtcConfig = options.rtcConfig ?? {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
            ],
        };
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
        if (!isCallRuntimeSupported()) {
            this.fail("Call runtime unavailable (RTCPeerConnection/getUserMedia missing).");
            return;
        }
        try {
            await this.ensureSignalingStarted();
            this.activeSessionId = randomId("call");
            this.activePeerId = peerId;
            await this.ensureLocalMedia(mode);
            const connection = await this.createConnection(peerId, true);
            this.setState({
                phase: "connecting",
                mode,
                peerId,
                route,
                ...nowRouteMetrics(route),
                durationSec: 0,
                reason: undefined,
            });
            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);
            await this.sendSignal(peerId, this.activeSessionId, "offer", {
                sdp: connection.localDescription,
                mode,
            });
        }
        catch (error) {
            this.fail(error instanceof Error ? error.message : "Failed to start call.");
        }
    }
    async endCall(reason = "local_end") {
        const peerId = this.activePeerId ?? this.state.peerId;
        const sessionId = this.activeSessionId ?? randomId("call");
        if (peerId && this.signalingStarted) {
            try {
                await this.sendSignal(peerId, sessionId, "hangup", { reason });
            }
            catch {
                // Ignore network close race.
            }
        }
        this.closeConnection();
        this.stopTimer();
        this.setState({
            phase: "ended",
            reason,
        });
    }
    toggleMute() {
        const nextMuted = !this.state.muted;
        this.localStream?.getAudioTracks?.().forEach((track) => {
            track.enabled = !nextMuted;
        });
        this.setState({ muted: nextMuted });
    }
    toggleCamera() {
        const nextCameraEnabled = !this.state.cameraEnabled;
        this.localStream?.getVideoTracks?.().forEach((track) => {
            track.enabled = nextCameraEnabled;
        });
        this.setState({ cameraEnabled: nextCameraEnabled });
    }
    toggleSpeaker() {
        this.setState({
            speakerEnabled: !this.state.speakerEnabled,
        });
    }
    switchRoute(route) {
        this.setState({
            route,
            ...nowRouteMetrics(route),
        });
    }
    dispose() {
        this.closeConnection();
        this.stopTimer();
        this.unsubscribeSignal?.();
        this.unsubscribeSignal = null;
        if (this.signalingStarted) {
            void this.signaling.stop();
        }
        this.signalingStarted = false;
        this.listeners.clear();
    }
    setState(partial) {
        this.state = {
            ...this.state,
            ...partial,
        };
        this.emit();
    }
    emit() {
        const snapshot = this.getState();
        this.listeners.forEach((listener) => listener(snapshot));
    }
    fail(reason) {
        this.closeConnection();
        this.stopTimer();
        this.setState({
            phase: "failed",
            reason,
        });
    }
    async ensureSignalingStarted() {
        if (this.signalingStarted) {
            return;
        }
        await this.signaling.start(this.localPeerId);
        this.unsubscribeSignal = this.signaling.subscribe((envelope) => {
            void this.onSignal(envelope);
        });
        this.signalingStarted = true;
    }
    async ensureLocalMedia(mode) {
        if (this.localStream) {
            return;
        }
        const mediaDevices = getMediaDevices();
        if (!mediaDevices?.getUserMedia) {
            throw new Error("getUserMedia unavailable.");
        }
        this.localStream = await mediaDevices.getUserMedia({
            audio: true,
            video: mode === "video",
        });
        this.setState({
            muted: false,
            cameraEnabled: mode === "video",
        });
    }
    async createConnection(peerId, initiator) {
        this.closeConnection();
        const RTCPeerConnectionCtor = getRTCPeerConnectionCtor();
        if (!RTCPeerConnectionCtor) {
            throw new Error("RTCPeerConnection unavailable.");
        }
        const connection = new RTCPeerConnectionCtor(this.rtcConfig);
        this.connection = connection;
        this.activePeerId = peerId;
        if (this.localStream?.getTracks) {
            this.localStream.getTracks().forEach((track) => {
                connection.addTrack(track, this.localStream);
            });
        }
        connection.onicecandidate = (event) => {
            if (!event?.candidate || !this.activePeerId || !this.activeSessionId) {
                return;
            }
            void this.sendSignal(this.activePeerId, this.activeSessionId, "ice", event.candidate);
        };
        connection.onconnectionstatechange = () => {
            const state = connection.connectionState;
            if (state === "connected") {
                this.setState({
                    phase: "connected",
                    encrypted: true,
                    reason: undefined,
                });
                this.startTimer();
                return;
            }
            if (state === "failed") {
                this.fail("Call connection failed.");
                return;
            }
            if (state === "disconnected") {
                this.fail("Call disconnected.");
            }
        };
        connection.ontrack = (event) => {
            this.remoteStream = event.streams?.[0] ?? null;
        };
        if (initiator) {
            const channel = connection.createDataChannel("naier-call-control", {
                ordered: true,
            });
            this.dataChannel = channel;
        }
        else {
            connection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
            };
        }
        return connection;
    }
    closeConnection() {
        try {
            this.dataChannel?.close?.();
        }
        catch {
            // Ignore.
        }
        this.dataChannel = null;
        try {
            this.connection?.close?.();
        }
        catch {
            // Ignore.
        }
        this.connection = null;
        try {
            this.localStream?.getTracks?.().forEach((track) => track.stop?.());
        }
        catch {
            // Ignore.
        }
        this.localStream = null;
        this.remoteStream = null;
        this.activeSessionId = null;
        this.activePeerId = null;
    }
    async onSignal(envelope) {
        if (!this.signalingStarted) {
            return;
        }
        if (envelope.toPeerId !== this.localPeerId) {
            return;
        }
        if (envelope.type === "bootstrap") {
            return;
        }
        const fromPeerId = envelope.fromPeerId;
        const payload = (envelope.payload ?? {});
        if (envelope.type === "hangup") {
            this.closeConnection();
            this.stopTimer();
            this.setState({
                phase: "ended",
                reason: "remote_end",
            });
            return;
        }
        if (!isCallRuntimeSupported()) {
            this.fail("Call runtime unavailable.");
            return;
        }
        if (envelope.type === "offer") {
            const requestedMode = payload.mode === "video" ? "video" : "voice";
            this.activeSessionId = envelope.sessionId || randomId("call");
            this.activePeerId = fromPeerId;
            await this.ensureSignalingStarted();
            await this.ensureLocalMedia(requestedMode);
            const connection = await this.createConnection(fromPeerId, false);
            this.setState({
                phase: "connecting",
                mode: requestedMode,
                peerId: fromPeerId,
                ...nowRouteMetrics(this.state.route),
                durationSec: 0,
                reason: undefined,
            });
            const RTCSessionDescriptionCtor = getRTCSessionDescriptionCtor();
            const remoteDescription = RTCSessionDescriptionCtor
                ? new RTCSessionDescriptionCtor(payload.sdp)
                : payload.sdp;
            await connection.setRemoteDescription(remoteDescription);
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            await this.sendSignal(fromPeerId, this.activeSessionId, "answer", {
                sdp: connection.localDescription,
                mode: requestedMode,
            });
            return;
        }
        if (envelope.type === "answer") {
            if (!this.connection) {
                return;
            }
            const RTCSessionDescriptionCtor = getRTCSessionDescriptionCtor();
            const remoteDescription = RTCSessionDescriptionCtor
                ? new RTCSessionDescriptionCtor(payload.sdp)
                : payload.sdp;
            await this.connection.setRemoteDescription(remoteDescription);
            return;
        }
        if (envelope.type === "ice") {
            if (!this.connection) {
                return;
            }
            const RTCIceCandidateCtor = getRTCIceCandidateCtor();
            const candidate = RTCIceCandidateCtor
                ? new RTCIceCandidateCtor(payload)
                : payload;
            try {
                await this.connection.addIceCandidate(candidate);
            }
            catch {
                // Ignore stale candidate.
            }
        }
    }
    async sendSignal(toPeerId, sessionId, type, payload) {
        await this.signaling.sendSignal({
            id: randomId("sig"),
            fromPeerId: this.localPeerId,
            toPeerId,
            sessionId,
            type,
            payload,
            createdAtIso: new Date().toISOString(),
        });
    }
    startTimer() {
        this.stopTimer();
        this.callTimer = setInterval(() => {
            this.setState({
                durationSec: this.state.durationSec + 1,
                ...nowRouteMetrics(this.state.route),
            });
        }, 1000);
    }
    stopTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    }
}
exports.WebRTCCallAdapter = WebRTCCallAdapter;
