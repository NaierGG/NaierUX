import type { IdentityProfile } from "../core/types";
import type { PersistedLocalKeyAgreement } from "../core/crypto";
import { deriveFingerprintFromPhrase, validateRecoveryPhrase } from "../core/identity";
import { loadSecureJson, saveSecureJson } from "./secureJson";

export interface PersistedIdentityState {
  version: 1;
  identity: IdentityProfile;
  keyAgreement?: PersistedLocalKeyAgreement | null;
}

const STORAGE_KEY = "naier.identity.v1";

const EMPTY_STATE: PersistedIdentityState | null = null;

function normalizeIdentity(value: unknown): IdentityProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const displayName = typeof candidate.displayName === "string" ? candidate.displayName.trim() : "";
  const createdAtIso = typeof candidate.createdAtIso === "string" ? candidate.createdAtIso.trim() : "";
  const publicFingerprint =
    typeof candidate.publicFingerprint === "string" ? candidate.publicFingerprint.trim().toUpperCase() : "";
  const recoveryWords = Array.isArray(candidate.recoveryWords)
    ? candidate.recoveryWords
        .filter((word): word is string => typeof word === "string")
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length > 0)
    : [];

  if (!displayName || !createdAtIso || !publicFingerprint || !validateRecoveryPhrase(recoveryWords)) {
    return null;
  }

  const derived = deriveFingerprintFromPhrase(recoveryWords);
  if (derived !== publicFingerprint) {
    return null;
  }

  return {
    displayName,
    createdAtIso,
    publicFingerprint,
    recoveryWords,
  };
}

function normalizePersistedKeyAgreement(value: unknown): PersistedLocalKeyAgreement | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const curve = candidate.curve;
  const keyId = typeof candidate.keyId === "string" ? candidate.keyId.trim() : "";
  const publicKeyHex = typeof candidate.publicKeyHex === "string" ? candidate.publicKeyHex.trim().toLowerCase() : "";
  if (curve !== "P-256" || !keyId || !publicKeyHex) {
    return null;
  }
  const privateJwk = candidate.privateJwk && typeof candidate.privateJwk === "object" ? (candidate.privateJwk as JsonWebKey) : null;
  return {
    curve: "P-256",
    keyId,
    publicKeyHex,
    privateJwk,
  };
}

function normalizeState(value: unknown): PersistedIdentityState | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const identity = normalizeIdentity(candidate.identity);
  if (!identity) {
    return null;
  }
  const keyAgreement = normalizePersistedKeyAgreement(candidate.keyAgreement);
  return {
    version: 1,
    identity,
    keyAgreement,
  };
}

export async function loadPersistedIdentityState(): Promise<PersistedIdentityState | null> {
  return loadSecureJson(STORAGE_KEY, normalizeState, EMPTY_STATE);
}

export async function savePersistedIdentityState(state: PersistedIdentityState): Promise<void> {
  await saveSecureJson(STORAGE_KEY, {
    version: 1,
    identity: state.identity,
    keyAgreement: state.keyAgreement ?? null,
  } satisfies PersistedIdentityState);
}
