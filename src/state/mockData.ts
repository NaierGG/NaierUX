import type { ChatMessage, ChatPreview, ContactProfile, DisappearPolicy, RouteMode, TrustState } from "../core/types";

export const DEFAULT_ROUTE: RouteMode = "Direct P2P";
export const DEFAULT_POLICY: DisappearPolicy = "5 min";

export const CHAT_PREVIEWS: ChatPreview[] = [
  {
    id: "chat-astra",
    name: "Astra",
    lastMessage: "Route switched to direct P2P.",
    timeLabel: "09:32",
    unread: 2,
    trust: "verified",
  },
  {
    id: "chat-node11",
    name: "Node-11",
    lastMessage: "Fingerprint verified in person.",
    timeLabel: "08:55",
    unread: 0,
    trust: "unverified",
  },
  {
    id: "chat-ops",
    name: "Ops Mesh",
    lastMessage: "New disappearing policy: 24h",
    timeLabel: "Yesterday",
    unread: 6,
    trust: "verified",
  },
];

export const CONTACTS: ContactProfile[] = [
  {
    peerId: "peer-astra",
    name: "Astra",
    fingerprintPreview: "8A4D:2C9F:77E1",
    online: true,
    trust: "verified",
  },
  {
    peerId: "peer-node11",
    name: "Node-11",
    fingerprintPreview: "11AF:33B0:88D2",
    online: false,
    trust: "unverified",
  },
  {
    peerId: "peer-sable",
    name: "Sable",
    fingerprintPreview: "9FD1:12AC:44E0",
    online: true,
    trust: "changed_key",
  },
  {
    peerId: "peer-ops",
    name: "Ops Mesh",
    fingerprintPreview: "C114:7D91:20AE",
    online: true,
    trust: "verified",
  },
];

export const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    chatId: "chat-astra",
    text: "Handshake complete. Route is onion relay.",
    fromMe: false,
    sentAtLabel: "09:21",
    delivery: "sent",
  },
  {
    id: "msg-2",
    chatId: "chat-astra",
    text: "Set timer to 5 minutes for this thread.",
    fromMe: true,
    sentAtLabel: "09:22",
    delivery: "sent",
    expiresIn: "5 min",
  },
  {
    id: "msg-3",
    chatId: "chat-astra",
    text: "Received. Anti-delete lock is enabled.",
    fromMe: false,
    sentAtLabel: "09:23",
    delivery: "sent",
  },
  {
    id: "msg-4",
    chatId: "chat-node11",
    text: "Connection verified. Ready on relay path.",
    fromMe: false,
    sentAtLabel: "08:54",
    delivery: "sent",
  },
  {
    id: "msg-5",
    chatId: "chat-node11",
    text: "Copy. Keep trust level at unverified until in-person check.",
    fromMe: true,
    sentAtLabel: "08:55",
    delivery: "sent",
  },
  {
    id: "msg-6",
    chatId: "chat-ops",
    text: "Ops update: route lock switched to Tor for this room.",
    fromMe: false,
    sentAtLabel: "Yesterday",
    delivery: "sent",
  },
];

function compactId(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function hashHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
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
  const hashed = hashHex(peerId);
  return `${hashed.slice(0, 4)}:${hashed.slice(4, 8)}:${hashHex(`${peerId}-alt`).slice(0, 4)}`;
}

export function makeContactProfile(
  peerId: string,
  name: string,
  trust: TrustState = "unverified",
): ContactProfile {
  return {
    peerId: peerId.startsWith("peer-") ? peerId : `peer-${compactId(peerId) || "unknown"}`,
    name: name.trim() || "Unknown",
    fingerprintPreview: buildFingerprintPreview(peerId),
    online: true,
    trust,
  };
}
