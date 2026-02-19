import type { EncryptedPacket, RouteMode, RouteStatus } from "./types";
import { fallbackRoute, getRouteStatus, simulateSend } from "./transport";

type PacketHandler = (packet: EncryptedPacket, fromPeerId: string) => void;

const PEER_BUS = new Map<string, Set<PacketHandler>>();

export interface PeerDescriptor {
  peerId: string;
  fingerprint?: string;
  transports?: string[];
  lastSeenIso?: string;
}

export interface SendResult {
  delivered: boolean;
  routeUsed: RouteMode;
  latencyMs: number;
  relayHops: number;
  ackId?: string;
  error?: string;
}

export interface NetworkAdapter {
  readonly name: string;
  start(localPeerId: string): Promise<void>;
  stop(): Promise<void>;
  setRoute(route: RouteMode): void;
  getRoute(): RouteMode;
  getRouteStatus(): RouteStatus;
  sendPacket(packet: EncryptedPacket, toPeerId: string): Promise<SendResult>;
  subscribePackets(handler: PacketHandler): () => void;
  nextFallbackRoute(route: RouteMode): RouteMode;
}

export class InMemoryP2PAdapter implements NetworkAdapter {
  readonly name = "InMemoryP2PAdapter";

  private localPeerId = "";
  private route: RouteMode = "Direct P2P";
  private started = false;
  private localHandlers = new Set<PacketHandler>();

  async start(localPeerId: string): Promise<void> {
    this.localPeerId = localPeerId;
    this.started = true;
    if (!PEER_BUS.has(localPeerId)) {
      PEER_BUS.set(localPeerId, new Set());
    }
  }

  async stop(): Promise<void> {
    if (this.localPeerId) {
      PEER_BUS.delete(this.localPeerId);
    }
    this.started = false;
    this.localHandlers.clear();
    this.localPeerId = "";
  }

  setRoute(route: RouteMode): void {
    this.route = route;
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
    this.localHandlers.add(handler);
    const peerHandlers = PEER_BUS.get(this.localPeerId);
    if (peerHandlers) {
      peerHandlers.add(handler);
    }
    return () => {
      this.localHandlers.delete(handler);
      const localSet = PEER_BUS.get(this.localPeerId);
      localSet?.delete(handler);
    };
  }

  async sendPacket(packet: EncryptedPacket, toPeerId: string): Promise<SendResult> {
    if (!this.started) {
      return {
        delivered: false,
        routeUsed: this.route,
        latencyMs: 0,
        relayHops: this.route === "Direct P2P" ? 0 : this.route === "2-hop Relay" ? 2 : 3,
        error: "Network adapter is not started.",
      };
    }

    const status = this.getRouteStatus();
    const delivered = await simulateSend(this.route);
    const peerHandlers = PEER_BUS.get(toPeerId);
    const finalDelivery = delivered;

    if (finalDelivery && peerHandlers) {
      peerHandlers.forEach((handler) => {
        handler(packet, this.localPeerId);
      });
    }

    return {
      delivered: finalDelivery,
      routeUsed: this.route,
      latencyMs: status.latencyMs,
      relayHops: this.route === "Direct P2P" ? 0 : this.route === "2-hop Relay" ? 2 : 3,
      ackId: finalDelivery ? `ack-${packet.id}` : undefined,
      error: finalDelivery ? undefined : "Delivery failed on current route.",
    };
  }
}
