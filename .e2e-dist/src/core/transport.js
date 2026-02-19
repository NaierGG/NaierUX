"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRouteStatus = getRouteStatus;
exports.simulateSend = simulateSend;
exports.fallbackRoute = fallbackRoute;
const BASE_ROUTE_TABLE = {
    "Direct P2P": {
        route: "Direct P2P",
        bars: 5,
        label: "Low latency, peer direct",
    },
    "2-hop Relay": {
        route: "2-hop Relay",
        bars: 4,
        label: "Balanced privacy and reliability",
    },
    Tor: {
        route: "Tor",
        bars: 3,
        label: "Maximum route privacy",
    },
};
function getRouteStatus(route) {
    const base = BASE_ROUTE_TABLE[route];
    const jitter = Math.floor(Math.random() * 18);
    if (route === "Direct P2P") {
        return { ...base, latencyMs: 34 + jitter };
    }
    if (route === "2-hop Relay") {
        return { ...base, latencyMs: 58 + jitter };
    }
    return { ...base, latencyMs: 89 + jitter };
}
function routeSuccessRate(route) {
    if (route === "Direct P2P")
        return 0.9;
    if (route === "2-hop Relay")
        return 0.96;
    return 0.93;
}
async function simulateSend(route) {
    const status = getRouteStatus(route);
    const delay = Math.max(30, Math.min(300, status.latencyMs));
    await new Promise((resolve) => setTimeout(resolve, delay));
    return Math.random() < routeSuccessRate(route);
}
function fallbackRoute(route) {
    if (route === "Direct P2P")
        return "2-hop Relay";
    if (route === "2-hop Relay")
        return "Tor";
    return "2-hop Relay";
}
