import type { RouteMode } from "./types";
import { getRouteStatus } from "./transport";

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

function nextJitter(route: RouteMode): number {
  if (route === "Direct P2P") return 2 + Math.floor(Math.random() * 5);
  if (route === "2-hop Relay") return 5 + Math.floor(Math.random() * 7);
  return 7 + Math.floor(Math.random() * 10);
}

function nextLoss(route: RouteMode): number {
  if (route === "Direct P2P") return 0.2 + Math.random() * 0.6;
  if (route === "2-hop Relay") return 0.4 + Math.random() * 0.8;
  return 0.8 + Math.random() * 1.2;
}

function createBaseState(): CallState {
  const status = getRouteStatus("Direct P2P");
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
    const status = getRouteStatus(route);
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
      const refreshed = getRouteStatus(route);
      this.state = {
        ...this.state,
        phase: "connected",
        latencyMs: refreshed.latencyMs,
        bars: refreshed.bars,
      };
      this.emit();

      this.callTimer = setInterval(() => {
        const dynamic = getRouteStatus(this.state.route);
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
    const status = getRouteStatus(route);
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
