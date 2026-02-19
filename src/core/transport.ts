import type { RouteMode, RouteStatus } from "./types";

const BASE_ROUTE_TABLE: Record<RouteMode, Omit<RouteStatus, "latencyMs">> = {
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

export function getRouteStatus(route: RouteMode): RouteStatus {
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

function routeSuccessRate(route: RouteMode): number {
  if (route === "Direct P2P") return 0.9;
  if (route === "2-hop Relay") return 0.96;
  return 0.93;
}

export async function simulateSend(route: RouteMode): Promise<boolean> {
  const status = getRouteStatus(route);
  const delay = Math.max(30, Math.min(300, status.latencyMs));
  await new Promise((resolve) => setTimeout(resolve, delay));
  return Math.random() < routeSuccessRate(route);
}

export function fallbackRoute(route: RouteMode): RouteMode {
  if (route === "Direct P2P") return "2-hop Relay";
  if (route === "2-hop Relay") return "Tor";
  return "2-hop Relay";
}
