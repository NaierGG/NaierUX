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

interface StorageBackend {
  kind: "localStorage" | "asyncStorage" | "secureStore" | "memory";
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const STORAGE_KEY = "naier.peer-security.v1";

const EMPTY_STATE: PersistedPeerSecurityState = {
  version: 1,
  peerKeys: {},
  trustOverrides: {},
};

const memoryStore = new Map<string, string>();
let backendPromise: Promise<StorageBackend> | null = null;

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

function dynamicImport(moduleId: string): Promise<any> {
  // Avoid static module resolution so app still builds when optional backends are not installed.
  const importer = Function("moduleId", "return import(moduleId);") as (id: string) => Promise<any>;
  return importer(moduleId);
}

async function tryAsyncStorageBackend(): Promise<StorageBackend | null> {
  try {
    const mod = await dynamicImport("@react-native-async-storage/async-storage");
    const api = mod?.default ?? mod;
    if (typeof api?.getItem !== "function" || typeof api?.setItem !== "function") {
      return null;
    }
    return {
      kind: "asyncStorage",
      getItem: (key) => api.getItem(key),
      setItem: (key, value) => api.setItem(key, value),
    };
  } catch {
    return null;
  }
}

async function trySecureStoreBackend(): Promise<StorageBackend | null> {
  try {
    const mod = await dynamicImport("expo-secure-store");
    if (typeof mod?.getItemAsync !== "function" || typeof mod?.setItemAsync !== "function") {
      return null;
    }
    return {
      kind: "secureStore",
      getItem: (key) => mod.getItemAsync(key),
      setItem: (key, value) => mod.setItemAsync(key, value),
    };
  } catch {
    return null;
  }
}

async function resolveStorageBackend(): Promise<StorageBackend> {
  const local = getLocalStorage();
  if (local) {
    return {
      kind: "localStorage",
      getItem: async (key) => local.getItem(key),
      setItem: async (key, value) => {
        local.setItem(key, value);
      },
    };
  }

  const asyncStorage = await tryAsyncStorageBackend();
  if (asyncStorage) {
    return asyncStorage;
  }

  const secureStore = await trySecureStoreBackend();
  if (secureStore) {
    return secureStore;
  }

  return {
    kind: "memory",
    getItem: async (key) => memoryStore.get(key) ?? null,
    setItem: async (key, value) => {
      memoryStore.set(key, value);
    },
  };
}

async function getBackend(): Promise<StorageBackend> {
  if (!backendPromise) {
    backendPromise = resolveStorageBackend();
  }
  return backendPromise;
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

export async function loadPersistedPeerSecurityState(): Promise<PersistedPeerSecurityState> {
  const backend = await getBackend();
  try {
    const raw = await backend.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_STATE;
    }
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return EMPTY_STATE;
  }
}

export async function savePersistedPeerSecurityState(state: PersistedPeerSecurityState): Promise<void> {
  const backend = await getBackend();
  try {
    await backend.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota/security write errors.
  }
}
