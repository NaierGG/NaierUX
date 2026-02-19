"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSecureJson = loadSecureJson;
exports.saveSecureJson = saveSecureJson;
exports.exportSecurePayload = exportSecurePayload;
exports.importSecurePayload = importSecurePayload;
const memoryStore = new Map();
let backendPromise = null;
const FALLBACK_STORAGE_SECRET = "naier-local-storage-key-v1";
function runtimeEnv(name) {
    try {
        const envObj = globalThis?.process?.env;
        const direct = envObj?.[name];
        if (typeof direct === "string" && direct.length > 0) {
            return direct;
        }
        const expoPublic = envObj?.[`EXPO_PUBLIC_${name}`];
        if (typeof expoPublic === "string" && expoPublic.length > 0) {
            return expoPublic;
        }
    }
    catch {
        // Ignore runtime env access errors.
    }
    return undefined;
}
function resolveStorageSecret() {
    const candidate = runtimeEnv("NAIER_STORAGE_KEY") ??
        runtimeEnv("NAIER_MESSAGE_KEY") ??
        runtimeEnv("NAIER_SIGNALING_TOKEN");
    const normalized = candidate?.trim();
    if (normalized && normalized.length >= 8) {
        return normalized;
    }
    return FALLBACK_STORAGE_SECRET;
}
function getLocalStorage() {
    try {
        const storage = globalThis?.localStorage;
        if (storage && typeof storage.getItem === "function" && typeof storage.setItem === "function") {
            return storage;
        }
    }
    catch {
        // Ignore local storage access failures.
    }
    return null;
}
function dynamicImport(moduleId) {
    const importer = Function("moduleId", "return import(moduleId);");
    return importer(moduleId);
}
async function tryAsyncStorageBackend() {
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
    }
    catch {
        return null;
    }
}
async function trySecureStoreBackend() {
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
    }
    catch {
        return null;
    }
}
async function resolveStorageBackend() {
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
async function getStorageBackend() {
    if (!backendPromise) {
        backendPromise = resolveStorageBackend();
    }
    return backendPromise;
}
function getCryptoObject() {
    return globalThis?.crypto;
}
function getSubtleCrypto() {
    return getCryptoObject()?.subtle;
}
function utf8Encode(value) {
    if (typeof TextEncoder !== "undefined") {
        return new TextEncoder().encode(value);
    }
    const escaped = unescape(encodeURIComponent(value));
    const bytes = new Uint8Array(escaped.length);
    for (let i = 0; i < escaped.length; i += 1) {
        bytes[i] = escaped.charCodeAt(i);
    }
    return bytes;
}
function utf8Decode(bytes) {
    if (typeof TextDecoder !== "undefined") {
        return new TextDecoder().decode(bytes);
    }
    let value = "";
    for (let i = 0; i < bytes.length; i += 1) {
        value += String.fromCharCode(bytes[i]);
    }
    return decodeURIComponent(escape(value));
}
function toHex(bytes) {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}
function fromHex(value) {
    const normalized = value.trim();
    if (!normalized || normalized.length % 2 !== 0) {
        throw new Error("Invalid hex.");
    }
    const bytes = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < normalized.length; i += 2) {
        bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
    }
    return bytes;
}
function xorBytes(payload, secret) {
    const out = new Uint8Array(payload.length);
    for (let i = 0; i < payload.length; i += 1) {
        out[i] = payload[i] ^ secret[i % secret.length];
    }
    return out;
}
async function deriveAesKey(secret) {
    const subtle = getSubtleCrypto();
    if (!subtle) {
        return null;
    }
    try {
        const digest = await subtle.digest("SHA-256", utf8Encode(`naier-secure-store|${secret}`));
        return subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    }
    catch {
        return null;
    }
}
function randomBytes(length) {
    const cryptoObject = getCryptoObject();
    if (cryptoObject?.getRandomValues) {
        return cryptoObject.getRandomValues(new Uint8Array(length));
    }
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
        out[i] = Math.floor(Math.random() * 256);
    }
    return out;
}
function isCipherEnvelope(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    const candidate = value;
    return (candidate.version === 1 &&
        (candidate.algorithm === "aes-gcm-256" || candidate.algorithm === "xor-v1") &&
        typeof candidate.ivHex === "string" &&
        typeof candidate.ciphertextHex === "string");
}
async function sealJson(jsonText) {
    const secret = resolveStorageSecret();
    const plain = utf8Encode(jsonText);
    const aesKey = await deriveAesKey(secret);
    if (aesKey && getSubtleCrypto()) {
        const iv = randomBytes(12);
        const subtle = getSubtleCrypto();
        const encrypted = await subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plain);
        const envelope = {
            version: 1,
            algorithm: "aes-gcm-256",
            ivHex: toHex(iv),
            ciphertextHex: toHex(new Uint8Array(encrypted)),
        };
        return JSON.stringify(envelope);
    }
    const obfuscated = xorBytes(plain, utf8Encode(secret));
    const envelope = {
        version: 1,
        algorithm: "xor-v1",
        ivHex: "",
        ciphertextHex: toHex(obfuscated),
    };
    return JSON.stringify(envelope);
}
async function openSealedJson(payload) {
    let parsed;
    try {
        parsed = JSON.parse(payload);
    }
    catch {
        return null;
    }
    if (!isCipherEnvelope(parsed)) {
        return null;
    }
    const envelope = parsed;
    const secret = resolveStorageSecret();
    try {
        if (envelope.algorithm === "aes-gcm-256") {
            const subtle = getSubtleCrypto();
            if (!subtle) {
                return null;
            }
            const aesKey = await deriveAesKey(secret);
            if (!aesKey) {
                return null;
            }
            const iv = fromHex(envelope.ivHex);
            const ciphertext = fromHex(envelope.ciphertextHex);
            const plain = await subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);
            return utf8Decode(new Uint8Array(plain));
        }
        const ciphertext = fromHex(envelope.ciphertextHex);
        const decoded = xorBytes(ciphertext, utf8Encode(secret));
        return utf8Decode(decoded);
    }
    catch {
        return null;
    }
}
async function loadSecureJson(storageKey, normalize, fallback) {
    const backend = await getStorageBackend();
    try {
        const raw = await backend.getItem(storageKey);
        if (!raw) {
            return fallback;
        }
        const opened = await openSealedJson(raw);
        if (opened) {
            return normalize(JSON.parse(opened));
        }
        // Backward compatibility: allow loading plaintext JSON once, then future writes re-encrypt.
        return normalize(JSON.parse(raw));
    }
    catch {
        return fallback;
    }
}
async function saveSecureJson(storageKey, value) {
    const backend = await getStorageBackend();
    try {
        const sealed = await sealJson(JSON.stringify(value));
        await backend.setItem(storageKey, sealed);
    }
    catch {
        // Ignore write errors.
    }
}
async function exportSecurePayload(value) {
    return sealJson(JSON.stringify(value));
}
async function importSecurePayload(payload, normalize) {
    const opened = await openSealedJson(payload);
    if (!opened) {
        return null;
    }
    try {
        return normalize(JSON.parse(opened));
    }
    catch {
        return null;
    }
}
