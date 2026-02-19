import type { EncryptedPacket, RouteMode } from "./types";
import { isLegacyCryptoAllowed } from "./securityConfig";

const STRONG_SCHEME = "AES-256-GCM/HKDF-SHA256/HMAC-SHA256";
const LEGACY_SCHEME = "LEGACY-DEMO";

export interface SessionKeyBundle {
  identityKeyId: string;
  preKeyId: string;
  signedPreKey: string;
  createdAtIso: string;
}

export interface SessionState {
  sessionId: string;
  peerFingerprint: string;
  ratchetEpoch: number;
  cipherSuite: typeof STRONG_SCHEME | typeof LEGACY_SCHEME;
  establishedAtIso: string;
}

export interface CryptoCapability {
  strongCryptoAvailable: boolean;
  scheme: typeof STRONG_SCHEME | typeof LEGACY_SCHEME;
  blockingReason?: string;
}

function getCryptoObject(): any {
  return (globalThis as any).crypto;
}

function subtleAvailable(): boolean {
  const cryptoObject = getCryptoObject();
  return Boolean(cryptoObject?.subtle && cryptoObject?.getRandomValues);
}

function ensureCryptoRuntime(requireStrong = true): void {
  if (subtleAvailable()) {
    return;
  }
  if (!requireStrong && isLegacyCryptoAllowed()) {
    return;
  }
  throw new Error(
    "Strong crypto runtime unavailable. Web Crypto SubtleCrypto is required by strict policy.",
  );
}

function utf8Encode(value: string): Uint8Array {
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

function utf8Decode(bytes: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  }
  let value = "";
  for (let i = 0; i < bytes.length; i += 1) {
    value += String.fromCharCode(bytes[i]);
  }
  return decodeURIComponent(escape(value));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(value: string): Uint8Array {
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

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function randomBytes(length: number): Uint8Array {
  const cryptoObject = getCryptoObject();
  if (cryptoObject?.getRandomValues) {
    return cryptoObject.getRandomValues(new Uint8Array(length));
  }

  if (!isLegacyCryptoAllowed()) {
    throw new Error("Secure random source unavailable under strict crypto policy.");
  }

  // Compatibility fallback for unsupported runtimes in compat mode only.
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

function legacyDigest(bytes: Uint8Array): Uint8Array {
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

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const cryptoObject = getCryptoObject();
  if (cryptoObject?.subtle) {
    const digest = await cryptoObject.subtle.digest("SHA-256", data);
    return new Uint8Array(digest);
  }
  if (!isLegacyCryptoAllowed()) {
    throw new Error("SHA-256 fallback blocked by strict crypto policy.");
  }
  return legacyDigest(data);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}

async function deriveMaterial(session: SessionState, epoch: number) {
  const seed = utf8Encode(
    `naier/v1|${session.sessionId}|${session.peerFingerprint}|epoch:${epoch}`,
  );
  const root = await sha256(seed);
  const encSeed = await sha256(concatBytes(root, utf8Encode("enc")));
  const macSeed = await sha256(concatBytes(root, utf8Encode("mac")));
  return {
    encSeed: encSeed.slice(0, 32),
    macSeed: macSeed.slice(0, 32),
  };
}

async function hmacSign(macSeed: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoObject = getCryptoObject();
  if (cryptoObject?.subtle) {
    const key = await cryptoObject.subtle.importKey(
      "raw",
      macSeed,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await cryptoObject.subtle.sign("HMAC", key, data);
    return new Uint8Array(signature);
  }
  if (!isLegacyCryptoAllowed()) {
    throw new Error("HMAC fallback blocked by strict crypto policy.");
  }
  return sha256(concatBytes(macSeed, data));
}

async function aesGcmEncrypt(
  encSeed: Uint8Array,
  iv: Uint8Array,
  aad: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const cryptoObject = getCryptoObject();
  if (cryptoObject?.subtle) {
    const key = await cryptoObject.subtle.importKey("raw", encSeed, "AES-GCM", false, ["encrypt"]);
    const encrypted = await cryptoObject.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: aad,
        tagLength: 128,
      },
      key,
      plaintext,
    );
    return new Uint8Array(encrypted);
  }

  if (!isLegacyCryptoAllowed()) {
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

async function aesGcmDecrypt(
  encSeed: Uint8Array,
  iv: Uint8Array,
  aad: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  const cryptoObject = getCryptoObject();
  if (cryptoObject?.subtle) {
    const key = await cryptoObject.subtle.importKey("raw", encSeed, "AES-GCM", false, ["decrypt"]);
    const decrypted = await cryptoObject.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: aad,
        tagLength: 128,
      },
      key,
      ciphertext,
    );
    return new Uint8Array(decrypted);
  }

  if (!isLegacyCryptoAllowed()) {
    throw new Error("AES-GCM decrypt fallback blocked by strict crypto policy.");
  }

  const stream = await sha256(concatBytes(encSeed, iv, aad));
  const plain = new Uint8Array(ciphertext.length);
  for (let i = 0; i < ciphertext.length; i += 1) {
    plain[i] = ciphertext[i] ^ stream[i % stream.length];
  }
  return plain;
}

export function getCryptoCapability(): CryptoCapability {
  const allowLegacy = isLegacyCryptoAllowed();
  if (subtleAvailable()) {
    return { strongCryptoAvailable: true, scheme: STRONG_SCHEME };
  }
  if (allowLegacy) {
    return { strongCryptoAvailable: false, scheme: LEGACY_SCHEME };
  }
  return {
    strongCryptoAvailable: false,
    scheme: STRONG_SCHEME,
    blockingReason: "Strong crypto runtime unavailable and legacy compatibility mode is disabled.",
  };
}

export function createPreKeyBundle(identityKeyId: string): SessionKeyBundle {
  const rand = toHex(randomBytes(4));
  return {
    identityKeyId,
    preKeyId: `pre-${rand}`,
    signedPreKey: `sig-${toHex(randomBytes(8))}`,
    createdAtIso: new Date().toISOString(),
  };
}

export function establishSession(peerFingerprint: string): SessionState {
  ensureCryptoRuntime(false);
  const capability = getCryptoCapability();
  return {
    sessionId: `sess-${toHex(randomBytes(4))}`,
    peerFingerprint,
    ratchetEpoch: 1,
    cipherSuite: capability.scheme,
    establishedAtIso: new Date().toISOString(),
  };
}

export async function encryptForTransport(
  plaintext: string,
  session: SessionState,
  route: RouteMode,
): Promise<EncryptedPacket> {
  ensureCryptoRuntime(false);
  const material = await deriveMaterial(session, session.ratchetEpoch);
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

export async function decryptFromTransport(
  packet: EncryptedPacket,
  session: SessionState,
): Promise<string> {
  ensureCryptoRuntime(false);
  const material = await deriveMaterial(session, packet.ratchetEpoch);
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

export function advanceRatchet(session: SessionState): SessionState {
  return {
    ...session,
    ratchetEpoch: session.ratchetEpoch + 1,
  };
}
