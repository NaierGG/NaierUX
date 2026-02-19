"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLocalKeyAgreement = createLocalKeyAgreement;
exports.serializeLocalKeyAgreement = serializeLocalKeyAgreement;
exports.restoreLocalKeyAgreement = restoreLocalKeyAgreement;
exports.deriveAgreementSecretHex = deriveAgreementSecretHex;
exports.getCryptoCapability = getCryptoCapability;
exports.createPreKeyBundle = createPreKeyBundle;
exports.establishSession = establishSession;
exports.encryptForTransport = encryptForTransport;
exports.decryptFromTransport = decryptFromTransport;
exports.advanceRatchet = advanceRatchet;
exports.toKeyAgreementDescriptor = toKeyAgreementDescriptor;
const securityConfig_1 = require("./securityConfig");
const STRONG_SCHEME = "AES-256-GCM/HKDF-SHA256/HMAC-SHA256";
const LEGACY_SCHEME = "LEGACY-DEMO";
const MIN_MESSAGE_KEY_LENGTH = 16;
let cachedMessageKey = null;
function readEnv(name) {
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
        // Ignore process/env read failures.
    }
    return undefined;
}
function getCryptoObject() {
    return globalThis.crypto;
}
function getSubtleCrypto() {
    return getCryptoObject()?.subtle;
}
function subtleAvailable() {
    const cryptoObject = getCryptoObject();
    return Boolean(cryptoObject?.subtle && cryptoObject?.getRandomValues);
}
function ensureCryptoRuntime(requireStrong = true) {
    if (subtleAvailable()) {
        return;
    }
    if (!requireStrong && (0, securityConfig_1.isLegacyCryptoAllowed)()) {
        return;
    }
    throw new Error("Strong crypto runtime unavailable. Web Crypto SubtleCrypto is required by strict policy.");
}
function resolveMessageKey() {
    const raw = readEnv("NAIER_MESSAGE_KEY") ?? readEnv("NAIER_SIGNALING_TOKEN");
    const normalized = raw?.trim();
    if (!normalized) {
        throw new Error("Missing NAIER_MESSAGE_KEY (or NAIER_SIGNALING_TOKEN fallback). Set a shared secret on all peers.");
    }
    if (normalized.length < MIN_MESSAGE_KEY_LENGTH) {
        throw new Error(`NAIER_MESSAGE_KEY is too short. Use at least ${MIN_MESSAGE_KEY_LENGTH} characters.`);
    }
    return normalized;
}
function getMessageKeyBytes() {
    if (cachedMessageKey) {
        return cachedMessageKey;
    }
    cachedMessageKey = utf8Encode(resolveMessageKey());
    return cachedMessageKey;
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
    if (normalized.length % 2 !== 0) {
        throw new Error("Invalid hex input.");
    }
    const bytes = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < normalized.length; i += 2) {
        bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
    }
    return bytes;
}
function concatBytes(...chunks) {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }
    return merged;
}
function randomBytes(length) {
    const cryptoObject = getCryptoObject();
    if (cryptoObject?.getRandomValues) {
        return cryptoObject.getRandomValues(new Uint8Array(length));
    }
    if (!(0, securityConfig_1.isLegacyCryptoAllowed)()) {
        throw new Error("Secure random source unavailable under strict crypto policy.");
    }
    // Compatibility fallback for unsupported runtimes in compat mode only.
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
        out[i] = Math.floor(Math.random() * 256);
    }
    return out;
}
function compactKeyId(input) {
    const cleaned = input.toLowerCase().replace(/[^a-z0-9]/g, "");
    const suffix = cleaned.slice(0, 12) || toHex(randomBytes(4));
    return `ka-${suffix}`;
}
function isHex(input) {
    return /^[0-9a-f]+$/i.test(input);
}
function normalizePublicKeyHex(input) {
    const normalized = input.trim().toLowerCase();
    if (!normalized || normalized.length % 2 !== 0 || !isHex(normalized)) {
        throw new Error("Invalid key agreement public key format.");
    }
    return normalized;
}
async function createLocalKeyAgreement(identityFingerprint) {
    const subtle = getSubtleCrypto();
    if (!subtle) {
        if ((0, securityConfig_1.isLegacyCryptoAllowed)()) {
            return {
                curve: "P-256",
                keyId: compactKeyId(identityFingerprint),
                publicKeyHex: "",
                privateKey: null,
            };
        }
        throw new Error("ECDH key agreement requires Web Crypto SubtleCrypto.");
    }
    const pair = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const raw = await subtle.exportKey("raw", pair.publicKey);
    return {
        curve: "P-256",
        keyId: compactKeyId(identityFingerprint),
        publicKeyHex: toHex(new Uint8Array(raw)),
        privateKey: pair.privateKey,
    };
}
async function serializeLocalKeyAgreement(localAgreement) {
    if (!localAgreement) {
        return null;
    }
    const base = {
        curve: "P-256",
        keyId: localAgreement.keyId.trim(),
        publicKeyHex: localAgreement.publicKeyHex.trim().toLowerCase(),
    };
    if (!base.keyId || !base.publicKeyHex || !localAgreement.privateKey) {
        return base;
    }
    const subtle = getSubtleCrypto();
    if (!subtle) {
        return base;
    }
    try {
        const privateJwk = await subtle.exportKey("jwk", localAgreement.privateKey);
        return {
            ...base,
            privateJwk,
        };
    }
    catch {
        return base;
    }
}
async function restoreLocalKeyAgreement(persisted) {
    if (!persisted || persisted.curve !== "P-256") {
        return null;
    }
    const keyId = persisted.keyId.trim();
    const publicKeyHex = normalizePublicKeyHex(persisted.publicKeyHex);
    if (!keyId || !publicKeyHex) {
        return null;
    }
    const subtle = getSubtleCrypto();
    if (!subtle || !persisted.privateJwk) {
        return {
            curve: "P-256",
            keyId,
            publicKeyHex,
            privateKey: null,
        };
    }
    try {
        const privateKey = await subtle.importKey("jwk", persisted.privateJwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
        return {
            curve: "P-256",
            keyId,
            publicKeyHex,
            privateKey,
        };
    }
    catch {
        return {
            curve: "P-256",
            keyId,
            publicKeyHex,
            privateKey: null,
        };
    }
}
async function deriveAgreementSecretHex(localAgreement, remoteDescriptor) {
    if (!localAgreement.privateKey) {
        return null;
    }
    if (remoteDescriptor.curve !== "P-256") {
        return null;
    }
    const subtle = getSubtleCrypto();
    if (!subtle) {
        return null;
    }
    const remotePublicKeyHex = normalizePublicKeyHex(remoteDescriptor.publicKeyHex);
    const imported = await subtle.importKey("raw", fromHex(remotePublicKeyHex), { name: "ECDH", namedCurve: "P-256" }, false, []);
    const bits = await subtle.deriveBits({ name: "ECDH", public: imported }, localAgreement.privateKey, 256);
    return toHex(new Uint8Array(bits));
}
function legacyDigest(bytes) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    let h3 = 0x45d9f3b;
    let h4 = 0x9e3779b1;
    for (let i = 0; i < bytes.length; i += 1) {
        const value = bytes[i];
        h1 = Math.imul(h1 ^ value, 0x01000193);
        h2 = Math.imul(h2 ^ value, 0x85ebca6b);
        h3 = Math.imul(h3 ^ value, 0xc2b2ae35);
        h4 = Math.imul(h4 ^ value, 0x27d4eb2f);
    }
    const out = new Uint8Array(32);
    const words = [h1, h2, h3, h4, h1 ^ h3, h2 ^ h4, h1 ^ h4, h2 ^ h3];
    for (let i = 0; i < words.length; i += 1) {
        out[i * 4 + 0] = words[i] & 0xff;
        out[i * 4 + 1] = (words[i] >>> 8) & 0xff;
        out[i * 4 + 2] = (words[i] >>> 16) & 0xff;
        out[i * 4 + 3] = (words[i] >>> 24) & 0xff;
    }
    return out;
}
async function sha256(data) {
    const cryptoObject = getCryptoObject();
    if (cryptoObject?.subtle) {
        const digest = await cryptoObject.subtle.digest("SHA-256", data);
        return new Uint8Array(digest);
    }
    if (!(0, securityConfig_1.isLegacyCryptoAllowed)()) {
        throw new Error("SHA-256 fallback blocked by strict crypto policy.");
    }
    return legacyDigest(data);
}
function constantTimeEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    let mismatch = 0;
    for (let i = 0; i < a.length; i += 1) {
        mismatch |= a[i] ^ b[i];
    }
    return mismatch === 0;
}
async function deriveMaterial(session, epoch, agreementSecretHex) {
    const seed = utf8Encode(`naier/v1|${session.sessionId}|${session.peerFingerprint}|epoch:${epoch}`);
    const agreementSecret = agreementSecretHex && agreementSecretHex.trim().length > 0
        ? fromHex(agreementSecretHex)
        : utf8Encode("psk-only");
    const root = await hmacSign(getMessageKeyBytes(), concatBytes(seed, utf8Encode("|"), agreementSecret));
    const encSeed = await sha256(concatBytes(root, utf8Encode("enc")));
    const macSeed = await sha256(concatBytes(root, utf8Encode("mac")));
    return {
        encSeed: encSeed.slice(0, 32),
        macSeed: macSeed.slice(0, 32),
    };
}
async function hmacSign(macSeed, data) {
    const cryptoObject = getCryptoObject();
    if (cryptoObject?.subtle) {
        const key = await cryptoObject.subtle.importKey("raw", macSeed, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const signature = await cryptoObject.subtle.sign("HMAC", key, data);
        return new Uint8Array(signature);
    }
    if (!(0, securityConfig_1.isLegacyCryptoAllowed)()) {
        throw new Error("HMAC fallback blocked by strict crypto policy.");
    }
    return sha256(concatBytes(macSeed, data));
}
async function aesGcmEncrypt(encSeed, iv, aad, plaintext) {
    const cryptoObject = getCryptoObject();
    if (cryptoObject?.subtle) {
        const key = await cryptoObject.subtle.importKey("raw", encSeed, "AES-GCM", false, ["encrypt"]);
        const encrypted = await cryptoObject.subtle.encrypt({
            name: "AES-GCM",
            iv,
            additionalData: aad,
            tagLength: 128,
        }, key, plaintext);
        return new Uint8Array(encrypted);
    }
    if (!(0, securityConfig_1.isLegacyCryptoAllowed)()) {
        throw new Error("AES-GCM fallback blocked by strict crypto policy.");
    }
    // Compatibility fallback for runtimes without SubtleCrypto in compat mode only.
    const stream = await sha256(concatBytes(encSeed, iv, aad));
    const cipher = new Uint8Array(plaintext.length);
    for (let i = 0; i < plaintext.length; i += 1) {
        cipher[i] = plaintext[i] ^ stream[i % stream.length];
    }
    return cipher;
}
async function aesGcmDecrypt(encSeed, iv, aad, ciphertext) {
    const cryptoObject = getCryptoObject();
    if (cryptoObject?.subtle) {
        const key = await cryptoObject.subtle.importKey("raw", encSeed, "AES-GCM", false, ["decrypt"]);
        const decrypted = await cryptoObject.subtle.decrypt({
            name: "AES-GCM",
            iv,
            additionalData: aad,
            tagLength: 128,
        }, key, ciphertext);
        return new Uint8Array(decrypted);
    }
    if (!(0, securityConfig_1.isLegacyCryptoAllowed)()) {
        throw new Error("AES-GCM decrypt fallback blocked by strict crypto policy.");
    }
    const stream = await sha256(concatBytes(encSeed, iv, aad));
    const plain = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i += 1) {
        plain[i] = ciphertext[i] ^ stream[i % stream.length];
    }
    return plain;
}
function getCryptoCapability() {
    const allowLegacy = (0, securityConfig_1.isLegacyCryptoAllowed)();
    let messageKeyError;
    try {
        void getMessageKeyBytes();
    }
    catch (error) {
        messageKeyError = error instanceof Error ? error.message : "Message key configuration is invalid.";
    }
    if (subtleAvailable()) {
        return {
            strongCryptoAvailable: true,
            scheme: STRONG_SCHEME,
            ...(messageKeyError ? { blockingReason: messageKeyError } : {}),
        };
    }
    if (allowLegacy) {
        return {
            strongCryptoAvailable: false,
            scheme: LEGACY_SCHEME,
            ...(messageKeyError ? { blockingReason: messageKeyError } : {}),
        };
    }
    return {
        strongCryptoAvailable: false,
        scheme: STRONG_SCHEME,
        blockingReason: messageKeyError ??
            "Strong crypto runtime unavailable and legacy compatibility mode is disabled.",
    };
}
function createPreKeyBundle(identityKeyId) {
    const rand = toHex(randomBytes(4));
    return {
        identityKeyId,
        preKeyId: `pre-${rand}`,
        signedPreKey: `sig-${toHex(randomBytes(8))}`,
        createdAtIso: new Date().toISOString(),
    };
}
function establishSession(peerFingerprint) {
    ensureCryptoRuntime(false);
    void getMessageKeyBytes();
    const capability = getCryptoCapability();
    return {
        sessionId: `sess-${toHex(randomBytes(4))}`,
        peerFingerprint,
        ratchetEpoch: 1,
        cipherSuite: capability.scheme,
        establishedAtIso: new Date().toISOString(),
    };
}
async function encryptForTransport(plaintext, session, route, agreementSecretHex) {
    ensureCryptoRuntime(false);
    const material = await deriveMaterial(session, session.ratchetEpoch, agreementSecretHex);
    const iv = randomBytes(12);
    const aadText = `naier:aad|${session.sessionId}|${session.ratchetEpoch}|${route}`;
    const aad = utf8Encode(aadText);
    const plaintextBytes = utf8Encode(plaintext);
    const ciphertext = await aesGcmEncrypt(material.encSeed, iv, aad, plaintextBytes);
    const macInput = concatBytes(iv, aad, ciphertext);
    const mac = await hmacSign(material.macSeed, macInput);
    const capability = getCryptoCapability();
    return {
        id: `pkt-${Date.now()}`,
        scheme: capability.scheme,
        iv: toHex(iv),
        aad: aadText,
        ratchetEpoch: session.ratchetEpoch,
        ciphertext: toHex(ciphertext),
        mac: toHex(mac),
        route,
        createdAtIso: new Date().toISOString(),
    };
}
async function decryptFromTransport(packet, session, agreementSecretHex) {
    ensureCryptoRuntime(false);
    const material = await deriveMaterial(session, packet.ratchetEpoch, agreementSecretHex);
    const iv = fromHex(packet.iv);
    const aad = utf8Encode(packet.aad);
    const ciphertext = fromHex(packet.ciphertext);
    const packetMac = fromHex(packet.mac);
    const expectedMac = await hmacSign(material.macSeed, concatBytes(iv, aad, ciphertext));
    if (!constantTimeEqual(packetMac, expectedMac)) {
        throw new Error("Packet MAC validation failed.");
    }
    const plainBytes = await aesGcmDecrypt(material.encSeed, iv, aad, ciphertext);
    return utf8Decode(plainBytes);
}
function advanceRatchet(session) {
    return {
        ...session,
        ratchetEpoch: session.ratchetEpoch + 1,
    };
}
function toKeyAgreementDescriptor(localAgreement) {
    if (!localAgreement.publicKeyHex) {
        return null;
    }
    return {
        curve: localAgreement.curve,
        keyId: localAgreement.keyId,
        publicKeyHex: localAgreement.publicKeyHex,
    };
}
