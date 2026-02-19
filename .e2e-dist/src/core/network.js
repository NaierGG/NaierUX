"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryP2PAdapter = void 0;
const transport_1 = require("./transport");
const PEER_BUS = new Map();
class InMemoryP2PAdapter {
    constructor() {
        this.name = "InMemoryP2PAdapter";
        this.localPeerId = "";
        this.route = "Direct P2P";
        this.started = false;
        this.localHandlers = new Set();
    }
    async start(localPeerId) {
        this.localPeerId = localPeerId;
        this.started = true;
        if (!PEER_BUS.has(localPeerId)) {
            PEER_BUS.set(localPeerId, new Set());
        }
    }
    async stop() {
        if (this.localPeerId) {
            PEER_BUS.delete(this.localPeerId);
        }
        this.started = false;
        this.localHandlers.clear();
        this.localPeerId = "";
    }
    setRoute(route) {
        this.route = route;
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
    async sendPacket(packet, toPeerId) {
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
        const delivered = await (0, transport_1.simulateSend)(this.route);
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
exports.InMemoryP2PAdapter = InMemoryP2PAdapter;
