import type { TrustState } from "../core/types";

export type KnownPeerKey = {
  activeKeyId: string;
  activePublicKeyHex: string;
  pendingKeyId?: string;
  pendingPublicKeyHex?: string;
  updatedAtIso: string;
};

export type PersistedPeerSecurityState = {
  version: 1;
  peerKeys: Record<string, KnownPeerKey>;
  trustOverrides: Record<string, TrustState>;
};

const STORAGE_KEY = "naier.peer-security.v1";

const EMPTY_STATE: PersistedPeerSecurityState = {
  version: 1,
  peerKeys: {},
  trustOverrides: {},
};

function getLocalStorage(): Storage | null {
  try {
    const storage = (globalThis as any)?.localStorage;
    if (storage && typeof storage.getItem === "function" && typeof storage.setItem === "function") {
      return storage as Storage;
    }
  } catch {
    // Ignore runtime storage access errors.
  }
  return null;
}

function isTrustState(value: unknown): value is TrustState {
  return value === "verified" || value === "unverified" || value === "changed_key";
}

function normalizeKnownPeerKey(value: unknown): KnownPeerKey | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const activeKeyId = typeof candidate.activeKeyId === "string" ? candidate.activeKeyId.trim() : "";
  const activePublicKeyHex =
    typeof candidate.activePublicKeyHex === "string" ? candidate.activePublicKeyHex.trim().toLowerCase() : "";
  const updatedAtIso = typeof candidate.updatedAtIso === "string" ? candidate.updatedAtIso.trim() : "";
  if (!activeKeyId || !activePublicKeyHex || !updatedAtIso) {
    return null;
  }

  const pendingKeyId = typeof candidate.pendingKeyId === "string" ? candidate.pendingKeyId.trim() : undefined;
  const pendingPublicKeyHex =
    typeof candidate.pendingPublicKeyHex === "string"
      ? candidate.pendingPublicKeyHex.trim().toLowerCase()
      : undefined;

  return {
    activeKeyId,
    activePublicKeyHex,
    pendingKeyId: pendingKeyId || undefined,
    pendingPublicKeyHex: pendingPublicKeyHex || undefined,
    updatedAtIso,
  };
}

function normalizeState(value: unknown): PersistedPeerSecurityState {
  if (!value || typeof value !== "object") {
    return EMPTY_STATE;
  }
  const candidate = value as Record<string, unknown>;
  const rawPeerKeys = candidate.peerKeys;
  const rawTrust = candidate.trustOverrides;

  const peerKeys: Record<string, KnownPeerKey> = {};
  if (rawPeerKeys && typeof rawPeerKeys === "object") {
    Object.entries(rawPeerKeys as Record<string, unknown>).forEach(([peerId, key]) => {
      const normalized = normalizeKnownPeerKey(key);
      if (normalized) {
        peerKeys[peerId] = normalized;
      }
    });
  }

  const trustOverrides: Record<string, TrustState> = {};
  if (rawTrust && typeof rawTrust === "object") {
    Object.entries(rawTrust as Record<string, unknown>).forEach(([peerId, trust]) => {
      if (isTrustState(trust)) {
        trustOverrides[peerId] = trust;
      }
    });
  }

  return {
    version: 1,
    peerKeys,
    trustOverrides,
  };
}

export function loadPersistedPeerSecurityState(): PersistedPeerSecurityState {
  const storage = getLocalStorage();
  if (!storage) {
    return EMPTY_STATE;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_STATE;
    }
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return EMPTY_STATE;
  }
}

export function savePersistedPeerSecurityState(state: PersistedPeerSecurityState): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota/security write errors.
  }
}
