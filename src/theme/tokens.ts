import type { RouteMode } from "../core";

export type AccentMode = "Neon Green" | "Neon Red" | "Highlight Purple" | "Cyber Blue";

/* ── Aurora Glass Design Tokens ── */
export const COLORS = {
  /* Backgrounds */
  bg0: "#05060a",
  bg1: "#0a0d14",
  bgElevated: "#0f131c",

  /* Glass */
  glass: "rgba(14, 18, 28, 0.72)",
  glassHover: "rgba(18, 24, 38, 0.82)",
  glassBorder: "rgba(255, 255, 255, 0.06)",
  glassBorderHover: "rgba(255, 255, 255, 0.12)",

  /* Cards */
  card: "rgba(14, 18, 28, 0.72)",
  cardBorder: "rgba(255, 255, 255, 0.06)",

  /* Bubbles */
  myBubble: "rgba(0, 255, 136, 0.06)",
  myBubbleBorder: "rgba(0, 255, 136, 0.12)",
  peerBubble: "rgba(14, 18, 28, 0.72)",
  peerBubbleBorder: "rgba(255, 255, 255, 0.06)",

  /* Accents */
  accentMain: "#00FF88",
  accentAlert: "#FF2E63",
  accentHighlight: "#7C3AED",
  accentCyber: "#00D4FF",

  /* Text */
  textPrimary: "#eaf0fa",
  textSecondary: "#8895ad",
  textMuted: "#586880",

  /* Semantic */
  success: "#00FF88",
  danger: "#FF2E63",
  warn: "#f59e0b",
  black: "#050810",

  /* Input */
  inputBg: "rgba(12, 16, 24, 0.7)",
  inputBorder: "rgba(255, 255, 255, 0.06)",
  inputFocusBorder: "rgba(0, 255, 136, 0.3)",
} as const;

export const ROUTE_COLORS: Record<RouteMode, string> = {
  "Direct P2P": "#00FF88",
  "2-hop Relay": "#00D4FF",
  Tor: "#FF4B6E",
};

export const ROUTE_DIM_COLORS: Record<RouteMode, string> = {
  "Direct P2P": "rgba(0, 255, 136, 0.12)",
  "2-hop Relay": "rgba(0, 212, 255, 0.12)",
  Tor: "rgba(255, 75, 110, 0.12)",
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

export function routeDimColor(route: RouteMode): string {
  return ROUTE_DIM_COLORS[route];
}

export function nextRouteMode(route: RouteMode): RouteMode {
  if (route === "Direct P2P") return "2-hop Relay";
  if (route === "2-hop Relay") return "Tor";
  return "Direct P2P";
}

export function glow(color: string, opacity = 0.25): string {
  const normalized = color.replace("#", "");
  if (normalized.length !== 6) {
    return color;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
