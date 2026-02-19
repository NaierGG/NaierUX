import type { NetworkAdapter, SendResult } from "./network";
import type { SignalingAdapter, SignalEnvelope } from "./signaling";
import type { EncryptedPacket, RouteMode, RouteStatus } from "./types";
import { fallbackRoute, getRouteStatus } from "./transport";

type PacketHandler = (packet: EncryptedPacket, fromPeerId: string) => void;

type AnyRtcPeerConnection = any;
type AnyRtcDataChannel = any;
type AnyRtcConfiguration = any;
type AnyIceCandidate = any;
type AnySessionDescription = any;
type IceTransportPolicy = "all" | "relay";

export interface WebRTCP2PAdapterOptions {
  rtcConfig?: AnyRtcConfiguration;
  reconnectMaxAttempts?: number;
  reconnectBaseDelayMs?: number;
  candidatePolicyByRoute?: Partial<Record<RouteMode, IceTransportPolicy>>;
  renegotiateOnRouteSwitch?: boolean;
}

interface PeerContext {
  peerId: string;
  sessionId: string;
  pc: AnyRtcPeerConnection;
  channel: AnyRtcDataChannel | null;
  readyPromise: Promise<void>;
  resolveReady: () => void;
  rejectReady: (reason?: unknown) => void;
  initiator: boolean;
  closedByLocal: boolean;
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

function randomId(prefix: string): string {
  const rand = Math.floor(Math.random() * 1_000_000)
    .toString(16)
    .padStart(6, "0");
  return `${prefix}-${Date.now()}-${rand}`;
}

export function isWebRTCSupported(): boolean {
  return typeof getRTCPeerConnectionCtor() === "function";
}

function defaultRtcConfig(): AnyRtcConfiguration {
  return {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      // TURN placeholders. Replace with production credentials.
      { urls: "turn:turn.naier.local:3478?transport=udp", username: "naier", credential: "naier" },
      { urls: "turn:turn.naier.local:3478?transport=tcp", username: "naier", credential: "naier" },
    ],
  };
}

export class WebRTCP2PAdapter implements NetworkAdapter {
  readonly name = "WebRTCP2PAdapter";

  private route: RouteMode = "Direct P2P";
  private localPeerId = "";
  private started = false;
  private readonly signaling: SignalingAdapter;
  private readonly baseRtcConfig: AnyRtcConfiguration;
  private readonly reconnectMaxAttempts: number;
  private readonly reconnectBaseDelayMs: number;
  private readonly candidatePolicyByRoute: Record<RouteMode, IceTransportPolicy>;
  private readonly renegotiateOnRouteSwitch: boolean;
  private readonly listeners = new Set<PacketHandler>();
  private readonly peers = new Map<string, PeerContext>();
  private readonly reconnectAttempts = new Map<string, number>();
  private readonly reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private unsubscribeSignal: (() => void) | null = null;

  constructor(
    signalingAdapter: SignalingAdapter,
    optionsOrRtcConfig: WebRTCP2PAdapterOptions | AnyRtcConfiguration = {},
  ) {
    this.signaling = signalingAdapter;

    const normalizedOptions =
      "rtcConfig" in (optionsOrRtcConfig as WebRTCP2PAdapterOptions)
        ? (optionsOrRtcConfig as WebRTCP2PAdapterOptions)
        : ({ rtcConfig: optionsOrRtcConfig } as WebRTCP2PAdapterOptions);

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

  async start(localPeerId: string): Promise<void> {
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

  async stop(): Promise<void> {
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

  setRoute(route: RouteMode): void {
    const previousRoute = this.route;
    this.route = route;
    if (this.renegotiateOnRouteSwitch && previousRoute !== route) {
      this.restartAllPeers("route_switch");
    }
  }

  getRoute(): RouteMode {
    return this.route;
  }

  getRouteStatus(): RouteStatus {
    return getRouteStatus(this.route);
  }

  nextFallbackRoute(route: RouteMode): RouteMode {
    return fallbackRoute(route);
  }

  subscribePackets(handler: PacketHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  async sendPacket(packet: EncryptedPacket, toPeerId: string): Promise<SendResult> {
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
    } catch (error) {
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

  private buildRtcConfigForRoute(route: RouteMode): AnyRtcConfiguration {
    const policy = this.candidatePolicyByRoute[route];
    return {
      ...this.baseRtcConfig,
      iceTransportPolicy: policy,
    };
  }

  private ensurePeerContext(peerId: string, initiator: boolean): PeerContext {
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
    let resolveReady = () => {};
    let rejectReady = (_reason?: unknown) => {};
    const readyPromise = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    const ctx: PeerContext = {
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

    pc.onicecandidate = (event: { candidate?: AnyIceCandidate | null }) => {
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
    } else {
      pc.ondatachannel = (event: { channel: AnyRtcDataChannel }) => {
        this.attachDataChannel(ctx, event.channel);
      };
    }

    this.peers.set(peerId, ctx);
    return ctx;
  }

  private attachDataChannel(ctx: PeerContext, channel: AnyRtcDataChannel): void {
    ctx.channel = channel;
    channel.onopen = () => {
      ctx.resolveReady();
      this.reconnectAttempts.set(ctx.peerId, 0);
    };
    channel.onmessage = (event: { data: unknown }) => {
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

  private async ensureOpenChannel(peerId: string): Promise<PeerContext> {
    const ctx = this.ensurePeerContext(peerId, true);

    if (!ctx.pc.localDescription && (!ctx.channel || ctx.channel.readyState !== "open")) {
      await this.sendOffer(ctx);
    }

    await Promise.race([
      ctx.readyPromise,
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error("Timed out waiting for RTCDataChannel open.")), 7000);
      }),
    ]);

    if (!ctx.channel || ctx.channel.readyState !== "open") {
      throw new Error("RTCDataChannel is not open.");
    }
    return ctx;
  }

  private async sendOffer(ctx: PeerContext): Promise<void> {
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

  private async handleSignal(envelope: SignalEnvelope): Promise<void> {
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
      const remoteDescription: AnySessionDescription = RTCSessionDescriptionCtor
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
      const remoteDescription: AnySessionDescription = RTCSessionDescriptionCtor
        ? new RTCSessionDescriptionCtor(envelope.payload)
        : envelope.payload;
      await ctx.pc.setRemoteDescription(remoteDescription);
      return;
    }

    if (envelope.type === "ice") {
      const candidate: AnyIceCandidate = RTCIceCandidateCtor
        ? new RTCIceCandidateCtor(envelope.payload)
        : envelope.payload;
      try {
        await ctx.pc.addIceCandidate(candidate);
      } catch {
        // Ignore stale ICE candidates.
      }
    }
  }

  private handleDataMessage(fromPeerId: string, payload: unknown): void {
    let parsed: any = payload;
    if (typeof payload === "string") {
      try {
        parsed = JSON.parse(payload);
      } catch {
        return;
      }
    }
    if (!parsed || parsed.kind !== "naier_packet" || !parsed.packet) {
      return;
    }
    this.listeners.forEach((listener) => {
      listener(parsed.packet as EncryptedPacket, parsed.fromPeerId ?? fromPeerId);
    });
  }

  private scheduleReconnect(peerId: string, _reason: string): void {
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

  private async restartPeer(peerId: string): Promise<void> {
    if (!this.started) {
      return;
    }
    this.closePeer(peerId, true);
    try {
      await this.ensureOpenChannel(peerId);
    } catch {
      this.scheduleReconnect(peerId, "restart_failed");
    }
  }

  private restartAllPeers(_reason: string): void {
    for (const peerId of this.peers.keys()) {
      this.scheduleReconnect(peerId, "route_switch");
    }
  }

  private closePeer(peerId: string, localClose: boolean): void {
    const ctx = this.peers.get(peerId);
    if (!ctx) {
      return;
    }
    ctx.closedByLocal = localClose;
    try {
      ctx.channel?.close?.();
    } catch {
      // Ignore close errors.
    }
    try {
      ctx.pc?.close?.();
    } catch {
      // Ignore close errors.
    }
    this.peers.delete(peerId);
  }

  private clearReconnectTimers(): void {
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();
  }
}
