"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPersistedIdentityState = loadPersistedIdentityState;
exports.savePersistedIdentityState = savePersistedIdentityState;
const identity_1 = require("../core/identity");
const secureJson_1 = require("./secureJson");
const STORAGE_KEY = "naier.identity.v1";
const EMPTY_STATE = null;
function normalizeIdentity(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const candidate = value;
    const displayName = typeof candidate.displayName === "string" ? candidate.displayName.trim() : "";
    const createdAtIso = typeof candidate.createdAtIso === "string" ? candidate.createdAtIso.trim() : "";
    const publicFingerprint = typeof candidate.publicFingerprint === "string" ? candidate.publicFingerprint.trim().toUpperCase() : "";
    const recoveryWords = Array.isArray(candidate.recoveryWords)
        ? candidate.recoveryWords
            .filter((word) => typeof word === "string")
            .map((word) => word.trim().toLowerCase())
            .filter((word) => word.length > 0)
        : [];
    if (!displayName || !createdAtIso || !publicFingerprint || !(0, identity_1.validateRecoveryPhrase)(recoveryWords)) {
        return null;
    }
    const derived = (0, identity_1.deriveFingerprintFromPhrase)(recoveryWords);
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
function normalizePersistedKeyAgreement(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const candidate = value;
    const curve = candidate.curve;
    const keyId = typeof candidate.keyId === "string" ? candidate.keyId.trim() : "";
    const publicKeyHex = typeof candidate.publicKeyHex === "string" ? candidate.publicKeyHex.trim().toLowerCase() : "";
    if (curve !== "P-256" || !keyId || !publicKeyHex) {
        return null;
    }
    const privateJwk = candidate.privateJwk && typeof candidate.privateJwk === "object" ? candidate.privateJwk : null;
    return {
        curve: "P-256",
        keyId,
        publicKeyHex,
        privateJwk,
    };
}
function normalizeState(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const candidate = value;
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
async function loadPersistedIdentityState() {
    return (0, secureJson_1.loadSecureJson)(STORAGE_KEY, normalizeState, EMPTY_STATE);
}
async function savePersistedIdentityState(state) {
    await (0, secureJson_1.saveSecureJson)(STORAGE_KEY, {
        version: 1,
        identity: state.identity,
        keyAgreement: state.keyAgreement ?? null,
    });
}
