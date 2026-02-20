import type { RouteMode } from "./types";
import type { SignalEnvelope, SignalingAdapter } from "./signaling";
import { getRouteStatus } from "./transport";

type AnyRtcPeerConnection = any;
type AnyRtcDataChannel = any;
type AnyRtcConfiguration = any;
type AnyIceCandidate = any;
type AnySessionDescription = any;
type AnyMediaStream = any;
type AnyMediaStreamTrack = any;

export type CallMode = "voice" | "video";
export type CallPhase = "idle" | "connecting" | "connected" | "ended" | "failed";

export interface CallState {
  phase: CallPhase;
  mode: CallMode;
  peerId: string | null;
  route: RouteMode;
  encrypted: boolean;
  muted: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  latencyMs: number;
  bars: number;
  jitterMs: number;
  packetLossPct: number;
  durationSec: number;
  reason?: string;
}

export interface CallAdapter {
  getState(): CallState;
  subscribe(listener: (state: CallState) => void): () => void;
  startCall(peerId: string, mode: CallMode, route: RouteMode): Promise<void>;
  endCall(reason?: string): Promise<void>;
  toggleMute(): void;
  toggleCamera(): void;
  toggleSpeaker(): void;
  switchRoute(route: RouteMode): void;
  dispose(): void;
}

function nowRouteMetrics(route: RouteMode): Pick<CallState, "latencyMs" | "bars" | "jitterMs" | "packetLossPct"> {
  const status = getRouteStatus(route);
  const jitterMs =
    route === "Direct P2P"
      ? 2 + Math.floor(Math.random() * 5)
      : route === "2-hop Relay"
        ? 5 + Math.floor(Math.random() * 8)
        : 8 + Math.floor(Math.random() * 11);
  const packetLossPct =
    route === "Direct P2P"
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

function createBaseState(): CallState {
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

function randomId(prefix: string): string {
  const rand = Math.floor(Math.random() * 1_000_000)
    .toString(16)
    .padStart(6, "0");
  return `${prefix}-${Date.now()}-${rand}`;
}

function getRTCPeerConnectionCtor(): any {
  return (globalThis as any).RTCPeerConnection;
}

function getRTCSessionDescriptionCtor(): any {
  return (globalThis as any).RTCSessionDescription;
}

function getRTCIceCandidateCtor(): any {
  return (globalThis as any).RTCIceCandidate;
}

function getMediaDevices(): any {
  return (globalThis as any)?.navigator?.mediaDevices;
}

export function isCallRuntimeSupported(): boolean {
  const peerConnectionCtor = getRTCPeerConnectionCtor();
  const mediaDevices = getMediaDevices();
  return (
    typeof peerConnectionCtor === "function" &&
    mediaDevices &&
    typeof mediaDevices.getUserMedia === "function"
  );
}

export class DisabledCallAdapter implements CallAdapter {
  private state: CallState;
  private listeners = new Set<(state: CallState) => void>();

  constructor(private readonly reason: string) {
    this.state = {
      ...createBaseState(),
      phase: "failed",
      reason,
    };
  }

  getState(): CallState {
    return { ...this.state };
  }

  subscribe(listener: (state: CallState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async startCall(_peerId: string, _mode: CallMode, _route: RouteMode): Promise<void> {
    this.state = {
      ...this.state,
      phase: "failed",
      reason: this.reason,
    };
    this.emit();
  }

  async endCall(reason = "disabled"): Promise<void> {
    this.state = {
      ...this.state,
      phase: "ended",
      reason,
    };
    this.emit();
  }

  toggleMute(): void {}
  toggleCamera(): void {}
  toggleSpeaker(): void {}

  switchRoute(route: RouteMode): void {
    const metrics = nowRouteMetrics(route);
    this.state = {
      ...this.state,
      route,
      ...metrics,
    };
    this.emit();
  }

  dispose(): void {
    this.listeners.clear();
  }

  private emit(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export class MockWebRTCCallAdapter implements CallAdapter {
  private state: CallState = createBaseState();
  private listeners = new Set<(state: CallState) => void>();
  private callTimer: ReturnType<typeof setInterval> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;

  getState(): CallState {
    return { ...this.state };
  }

  subscribe(listener: (state: CallState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async startCall(peerId: string, mode: CallMode, route: RouteMode): Promise<void> {
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

  async endCall(reason = "local_end"): Promise<void> {
    this.clearTimers();
    this.state = {
      ...this.state,
      phase: "ended",
      reason,
    };
    this.emit();
  }

  toggleMute(): void {
    this.state = {
      ...this.state,
      muted: !this.state.muted,
    };
    this.emit();
  }

  toggleCamera(): void {
    this.state = {
      ...this.state,
      cameraEnabled: !this.state.cameraEnabled,
    };
    this.emit();
  }

  toggleSpeaker(): void {
    this.state = {
      ...this.state,
      speakerEnabled: !this.state.speakerEnabled,
    };
    this.emit();
  }

  switchRoute(route: RouteMode): void {
    this.state = {
      ...this.state,
      route,
      ...nowRouteMetrics(route),
    };
    this.emit();
  }

  dispose(): void {
    this.clearTimers();
    this.listeners.clear();
  }

  private emit(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private clearTimers(): void {
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

export interface WebRTCCallAdapterOptions {
  rtcConfig?: AnyRtcConfiguration;
}

export class WebRTCCallAdapter implements CallAdapter {
  private state: CallState = createBaseState();
  private listeners = new Set<(state: CallState) => void>();
  private signalingStarted = false;
  private unsubscribeSignal: (() => void) | null = null;
  private connection: AnyRtcPeerConnection | null = null;
  private dataChannel: AnyRtcDataChannel | null = null;
  private localStream: AnyMediaStream | null = null;
  private remoteStream: AnyMediaStream | null = null;
  private callTimer: ReturnType<typeof setInterval> | null = null;
  private activeSessionId: string | null = null;
  private activePeerId: string | null = null;
  private readonly rtcConfig: AnyRtcConfiguration;

  constructor(
    private readonly signaling: SignalingAdapter,
    private readonly localPeerId: string,
    options: WebRTCCallAdapterOptions = {},
  ) {
    this.rtcConfig = options.rtcConfig ?? {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };
  }

  getState(): CallState {
    return { ...this.state };
  }

  subscribe(listener: (state: CallState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async startCall(peerId: string, mode: CallMode, route: RouteMode): Promise<void> {
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
    } catch (error) {
      this.fail(error instanceof Error ? error.message : "Failed to start call.");
    }
  }

  async endCall(reason = "local_end"): Promise<void> {
    const peerId = this.activePeerId ?? this.state.peerId;
    const sessionId = this.activeSessionId ?? randomId("call");
    if (peerId && this.signalingStarted) {
      try {
        await this.sendSignal(peerId, sessionId, "hangup", { reason });
      } catch {
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

  toggleMute(): void {
    const nextMuted = !this.state.muted;
    this.localStream?.getAudioTracks?.().forEach((track: AnyMediaStreamTrack) => {
      track.enabled = !nextMuted;
    });
    this.setState({ muted: nextMuted });
  }

  toggleCamera(): void {
    const nextCameraEnabled = !this.state.cameraEnabled;
    this.localStream?.getVideoTracks?.().forEach((track: AnyMediaStreamTrack) => {
      track.enabled = nextCameraEnabled;
    });
    this.setState({ cameraEnabled: nextCameraEnabled });
  }

  toggleSpeaker(): void {
    this.setState({
      speakerEnabled: !this.state.speakerEnabled,
    });
  }

  switchRoute(route: RouteMode): void {
    this.setState({
      route,
      ...nowRouteMetrics(route),
    });
  }

  dispose(): void {
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

  private setState(partial: Partial<CallState>): void {
    this.state = {
      ...this.state,
      ...partial,
    };
    this.emit();
  }

  private emit(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private fail(reason: string): void {
    this.closeConnection();
    this.stopTimer();
    this.setState({
      phase: "failed",
      reason,
    });
  }

  private async ensureSignalingStarted(): Promise<void> {
    if (this.signalingStarted) {
      return;
    }
    await this.signaling.start(this.localPeerId);
    this.unsubscribeSignal = this.signaling.subscribe((envelope) => {
      void this.onSignal(envelope);
    });
    this.signalingStarted = true;
  }

  private async ensureLocalMedia(mode: CallMode): Promise<void> {
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

  private async createConnection(peerId: string, initiator: boolean): Promise<AnyRtcPeerConnection> {
    this.closeConnection();

    const RTCPeerConnectionCtor = getRTCPeerConnectionCtor();
    if (!RTCPeerConnectionCtor) {
      throw new Error("RTCPeerConnection unavailable.");
    }

    const connection = new RTCPeerConnectionCtor(this.rtcConfig);
    this.connection = connection;
    this.activePeerId = peerId;

    if (this.localStream?.getTracks) {
      this.localStream.getTracks().forEach((track: AnyMediaStreamTrack) => {
        connection.addTrack(track, this.localStream);
      });
    }

    connection.onicecandidate = (event: { candidate?: AnyIceCandidate | null }) => {
      if (!event?.candidate || !this.activePeerId || !this.activeSessionId) {
        return;
      }
      void this.sendSignal(this.activePeerId, this.activeSessionId, "candidate", event.candidate);
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

    connection.ontrack = (event: { streams?: AnyMediaStream[] }) => {
      this.remoteStream = event.streams?.[0] ?? null;
    };

    if (initiator) {
      const channel = connection.createDataChannel("naier-call-control", {
        ordered: true,
      });
      this.dataChannel = channel;
    } else {
      connection.ondatachannel = (event: { channel: AnyRtcDataChannel }) => {
        this.dataChannel = event.channel;
      };
    }

    return connection;
  }

  private closeConnection(): void {
    try {
      this.dataChannel?.close?.();
    } catch {
      // Ignore.
    }
    this.dataChannel = null;
    try {
      this.connection?.close?.();
    } catch {
      // Ignore.
    }
    this.connection = null;
    try {
      this.localStream?.getTracks?.().forEach((track: AnyMediaStreamTrack) => track.stop?.());
    } catch {
      // Ignore.
    }
    this.localStream = null;
    this.remoteStream = null;
    this.activeSessionId = null;
    this.activePeerId = null;
  }

  private async onSignal(envelope: SignalEnvelope): Promise<void> {
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
    const payload = (envelope.payload ?? {}) as Record<string, unknown>;

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
      const remoteDescription: AnySessionDescription = RTCSessionDescriptionCtor
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
      const remoteDescription: AnySessionDescription = RTCSessionDescriptionCtor
        ? new RTCSessionDescriptionCtor(payload.sdp)
        : payload.sdp;
      await this.connection.setRemoteDescription(remoteDescription);
      return;
    }

    if (envelope.type === "ice" || envelope.type === "candidate") {
      if (!this.connection) {
        return;
      }
      const RTCIceCandidateCtor = getRTCIceCandidateCtor();
      const candidate: AnyIceCandidate = RTCIceCandidateCtor
        ? new RTCIceCandidateCtor(payload)
        : payload;
      try {
        await this.connection.addIceCandidate(candidate);
      } catch {
        // Ignore stale candidate.
      }
    }
  }

  private async sendSignal(
    toPeerId: string,
    sessionId: string,
    type: "offer" | "answer" | "ice" | "candidate" | "hangup",
    payload: unknown,
  ): Promise<void> {
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

  private startTimer(): void {
    this.stopTimer();
    this.callTimer = setInterval(() => {
      this.setState({
        durationSec: this.state.durationSec + 1,
        ...nowRouteMetrics(this.state.route),
      });
    }, 1000);
  }

  private stopTimer(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
  }
}
