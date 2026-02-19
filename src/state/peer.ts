import type { ContactProfile, DisappearPolicy, RouteMode, TrustState } from "../core/types";

export const DEFAULT_ROUTE: RouteMode = "Direct P2P";
export const DEFAULT_POLICY: DisappearPolicy = "5 min";

export function compactId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function hashHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function normalizePeerId(peerId: string): string {
  const normalized = compactId(peerId.startsWith("peer-") ? peerId.slice(5) : peerId);
  return `peer-${normalized || "unknown"}`;
}

export function chatIdFromPeerId(peerId: string): string {
  const normalized = compactId(peerId.startsWith("peer-") ? peerId.slice(5) : peerId);
  return `chat-${normalized || "unknown"}`;
}

export function peerIdFromChatId(chatId: string): string {
  const normalized = compactId(chatId.startsWith("chat-") ? chatId.slice(5) : chatId);
  return `peer-${normalized || "unknown"}`;
}

export function buildFingerprintPreview(peerId: string): string {
  const normalizedPeerId = normalizePeerId(peerId);
  const hashed = hashHex(normalizedPeerId);
  return `${hashed.slice(0, 4)}:${hashed.slice(4, 8)}:${hashHex(`${normalizedPeerId}-alt`).slice(0, 4)}`;
}

export function makeContactProfile(
  peerId: string,
  name: string,
  trust: TrustState = "unverified",
): ContactProfile {
  const normalizedPeerId = normalizePeerId(peerId);
  return {
    peerId: normalizedPeerId,
    name: name.trim() || normalizedPeerId,
    fingerprintPreview: buildFingerprintPreview(normalizedPeerId),
    online: true,
    trust,
  };
}

export function peerIdFromFingerprint(fingerprint: string): string {
  const compact = fingerprint.toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffix = compact.slice(0, 16) || "local";
  return `peer-${suffix}`;
}
