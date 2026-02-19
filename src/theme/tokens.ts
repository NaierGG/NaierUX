import type { RouteMode } from "../core";

export type AccentMode = "Neon Green" | "Neon Red" | "Highlight Purple" | "Cyber Blue";

export const COLORS = {
  bg0: "#0A0A0A",
  bg1: "#0A0A0A",
  card: "#111111",
  cardBorder: "#1E1E1E",
  myBubble: "#1A1A1A",
  peerBubble: "#151515",
  accentMain: "#00FF88",
  accentAlert: "#FF2E63",
  accentHighlight: "#7C3AED",
  accentCyber: "#00D4FF",
  textPrimary: "#FFFFFF",
  textSecondary: "#AAAAAA",
  textMuted: "#555555",
  success: "#39FF14",
  danger: "#FF2E63",
  black: "#000000",
} as const;

export const ROUTE_COLORS: Record<RouteMode, string> = {
  "Direct P2P": "#39FF14",
  "2-hop Relay": "#00D4FF",
  Tor: "#FF2E63",
};

export const ACCENT_BY_MODE: Record<AccentMode, string> = {
  "Neon Green": COLORS.accentMain,
  "Neon Red": COLORS.accentAlert,
  "Highlight Purple": COLORS.accentHighlight,
  "Cyber Blue": COLORS.accentCyber,
};

export function routeColor(route: RouteMode): string {
  return ROUTE_COLORS[route];
}

export function nextRouteMode(route: RouteMode): RouteMode {
  if (route === "Direct P2P") return "2-hop Relay";
  if (route === "2-hop Relay") return "Tor";
  return "Direct P2P";
}

export function glow(color: string, opacity = 0.3): string {
  const normalized = color.replace("#", "");
  if (normalized.length !== 6) {
    return color;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
