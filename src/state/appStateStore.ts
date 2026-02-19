import type { ChatMessage, ChatPreview, ContactProfile, DisappearPolicy, RouteMode, TrustState } from "../core/types";
import type { SecurityPreferences } from "./preferences";
import { DEFAULT_SECURITY_PREFERENCES } from "./preferences";
import type { AccentMode } from "../theme/tokens";
import { DEFAULT_POLICY, DEFAULT_ROUTE, makeContactProfile, normalizePeerId } from "./peer";
import { exportSecurePayload, importSecurePayload, loadSecureJson, saveSecureJson } from "./secureJson";

export type ContactRequestDirection = "incoming" | "outgoing";

export interface ContactRequest {
  peerId: string;
  name: string;
  direction: ContactRequestDirection;
  preview?: string;
  createdAtIso: string;
}

export interface PersistedAppState {
  version: 1;
  route: RouteMode;
  disappearPolicy: DisappearPolicy;
  accentMode: AccentMode;
  messages: ChatMessage[];
  chats: ChatPreview[];
  contacts: ContactProfile[];
  securityPreferences: SecurityPreferences;
  contactRequests: ContactRequest[];
  blockedPeers: string[];
}

const STORAGE_KEY = "naier.app-state.v1";

const DEFAULT_APP_STATE: PersistedAppState = {
  version: 1,
  route: DEFAULT_ROUTE,
  disappearPolicy: DEFAULT_POLICY,
  accentMode: "Neon Green",
  messages: [],
  chats: [],
  contacts: [],
  securityPreferences: DEFAULT_SECURITY_PREFERENCES,
  contactRequests: [],
  blockedPeers: [],
};

function isRouteMode(value: unknown): value is RouteMode {
  return value === "Direct P2P" || value === "2-hop Relay" || value === "Tor";
}

function isDisappearPolicy(value: unknown): value is DisappearPolicy {
  return value === "5 min" || value === "1 h" || value === "24 h" || value === "30 d";
}

function isAccentMode(value: unknown): value is AccentMode {
  return value === "Neon Green" || value === "Neon Red" || value === "Highlight Purple" || value === "Cyber Blue";
}

function isTrustState(value: unknown): value is TrustState {
  return value === "verified" || value === "unverified" || value === "changed_key";
}

function isDeliveryState(value: unknown): value is ChatMessage["delivery"] {
  return value === "queued_local" || value === "sending" || value === "sent" || value === "failed";
}

function normalizeMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const chatId = typeof candidate.chatId === "string" ? candidate.chatId.trim() : "";
  const text = typeof candidate.text === "string" ? candidate.text : "";
  const fromMe = candidate.fromMe === true;
  const sentAtLabel = typeof candidate.sentAtLabel === "string" ? candidate.sentAtLabel : "";
  const delivery = isDeliveryState(candidate.delivery) ? candidate.delivery : null;
  const expiresIn = isDisappearPolicy(candidate.expiresIn) ? candidate.expiresIn : undefined;
  const routeUsed = isRouteMode(candidate.routeUsed) ? candidate.routeUsed : undefined;
  const cipherSuite = typeof candidate.cipherSuite === "string" ? candidate.cipherSuite : undefined;
  if (!id || !chatId || !sentAtLabel || !delivery) {
    return null;
  }
  return {
    id,
    chatId,
    text,
    fromMe,
    sentAtLabel,
    delivery,
    expiresIn,
    routeUsed,
    cipherSuite,
  };
}

function normalizeChat(value: unknown): ChatPreview | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const lastMessage = typeof candidate.lastMessage === "string" ? candidate.lastMessage : "";
  const timeLabel = typeof candidate.timeLabel === "string" ? candidate.timeLabel : "";
  const unread = typeof candidate.unread === "number" && Number.isFinite(candidate.unread) ? Math.max(0, Math.floor(candidate.unread)) : 0;
  const trust = isTrustState(candidate.trust) ? candidate.trust : "unverified";
  if (!id || !name || !timeLabel) {
    return null;
  }
  return {
    id,
    name,
    lastMessage,
    timeLabel,
    unread,
    trust,
  };
}

function normalizeContact(value: unknown): ContactProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const rawPeerId = typeof candidate.peerId === "string" ? candidate.peerId : "";
  const peerId = normalizePeerId(rawPeerId);
  const name = typeof candidate.name === "string" ? candidate.name.trim() : peerId;
  const trust = isTrustState(candidate.trust) ? candidate.trust : "unverified";
  const online = candidate.online === true;
  if (!peerId) {
    return null;
  }
  const base = makeContactProfile(peerId, name, trust);
  return {
    ...base,
    online,
  };
}

function normalizeSecurityPreferences(value: unknown): SecurityPreferences {
  if (!value || typeof value !== "object") {
    return DEFAULT_SECURITY_PREFERENCES;
  }
  const candidate = value as Record<string, unknown>;
  return {
    biometricLock: candidate.biometricLock !== false,
    screenshotBlock: candidate.screenshotBlock !== false,
    antiDelete: candidate.antiDelete !== false,
    preferDirectP2P: candidate.preferDirectP2P !== false,
    relayFallback: candidate.relayFallback !== false,
  };
}

function normalizeContactRequest(value: unknown): ContactRequest | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const peerId = normalizePeerId(typeof candidate.peerId === "string" ? candidate.peerId : "");
  const name = typeof candidate.name === "string" ? candidate.name.trim() : peerId;
  const direction = candidate.direction === "incoming" || candidate.direction === "outgoing" ? candidate.direction : null;
  const preview = typeof candidate.preview === "string" ? candidate.preview : undefined;
  const createdAtIso = typeof candidate.createdAtIso === "string" ? candidate.createdAtIso : new Date().toISOString();
  if (!peerId || !direction) {
    return null;
  }
  return {
    peerId,
    name: name || peerId,
    direction,
    preview,
    createdAtIso,
  };
}

function normalizeBlockedPeers(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  value.forEach((entry) => {
    if (typeof entry !== "string") {
      return;
    }
    const peerId = normalizePeerId(entry);
    seen.add(peerId);
  });
  return [...seen];
}

function normalizeState(value: unknown): PersistedAppState {
  if (!value || typeof value !== "object") {
    return DEFAULT_APP_STATE;
  }
  const candidate = value as Record<string, unknown>;
  const route = isRouteMode(candidate.route) ? candidate.route : DEFAULT_ROUTE;
  const disappearPolicy = isDisappearPolicy(candidate.disappearPolicy) ? candidate.disappearPolicy : DEFAULT_POLICY;
  const accentMode = isAccentMode(candidate.accentMode) ? candidate.accentMode : "Neon Green";
  const messages = Array.isArray(candidate.messages) ? candidate.messages.map(normalizeMessage).filter((item): item is ChatMessage => Boolean(item)) : [];
  const chats = Array.isArray(candidate.chats) ? candidate.chats.map(normalizeChat).filter((item): item is ChatPreview => Boolean(item)) : [];
  const contacts = Array.isArray(candidate.contacts) ? candidate.contacts.map(normalizeContact).filter((item): item is ContactProfile => Boolean(item)) : [];
  const securityPreferences = normalizeSecurityPreferences(candidate.securityPreferences);
  const contactRequests = Array.isArray(candidate.contactRequests)
    ? candidate.contactRequests.map(normalizeContactRequest).filter((item): item is ContactRequest => Boolean(item))
    : [];
  const blockedPeers = normalizeBlockedPeers(candidate.blockedPeers);

  return {
    version: 1,
    route,
    disappearPolicy,
    accentMode,
    messages,
    chats,
    contacts,
    securityPreferences,
    contactRequests,
    blockedPeers,
  };
}

export async function loadPersistedAppState(): Promise<PersistedAppState> {
  return loadSecureJson(STORAGE_KEY, normalizeState, DEFAULT_APP_STATE);
}

export async function savePersistedAppState(state: PersistedAppState): Promise<void> {
  await saveSecureJson(STORAGE_KEY, normalizeState(state));
}

export async function exportEncryptedAppBackup(state: PersistedAppState): Promise<string> {
  return exportSecurePayload(normalizeState(state));
}

export async function importEncryptedAppBackup(payload: string): Promise<PersistedAppState | null> {
  return importSecurePayload(payload, normalizeState);
}
