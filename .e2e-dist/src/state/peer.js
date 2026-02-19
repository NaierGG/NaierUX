"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_POLICY = exports.DEFAULT_ROUTE = void 0;
exports.compactId = compactId;
exports.normalizePeerId = normalizePeerId;
exports.chatIdFromPeerId = chatIdFromPeerId;
exports.peerIdFromChatId = peerIdFromChatId;
exports.buildFingerprintPreview = buildFingerprintPreview;
exports.makeContactProfile = makeContactProfile;
exports.peerIdFromFingerprint = peerIdFromFingerprint;
exports.DEFAULT_ROUTE = "Direct P2P";
exports.DEFAULT_POLICY = "5 min";
function compactId(raw) {
    return raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
function hashHex(input) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}
function normalizePeerId(peerId) {
    const normalized = compactId(peerId.startsWith("peer-") ? peerId.slice(5) : peerId);
    return `peer-${normalized || "unknown"}`;
}
function chatIdFromPeerId(peerId) {
    const normalized = compactId(peerId.startsWith("peer-") ? peerId.slice(5) : peerId);
    return `chat-${normalized || "unknown"}`;
}
function peerIdFromChatId(chatId) {
    const normalized = compactId(chatId.startsWith("chat-") ? chatId.slice(5) : chatId);
    return `peer-${normalized || "unknown"}`;
}
function buildFingerprintPreview(peerId) {
    const normalizedPeerId = normalizePeerId(peerId);
    const hashed = hashHex(normalizedPeerId);
    return `${hashed.slice(0, 4)}:${hashed.slice(4, 8)}:${hashHex(`${normalizedPeerId}-alt`).slice(0, 4)}`;
}
function makeContactProfile(peerId, name, trust = "unverified") {
    const normalizedPeerId = normalizePeerId(peerId);
    return {
        peerId: normalizedPeerId,
        name: name.trim() || normalizedPeerId,
        fingerprintPreview: buildFingerprintPreview(normalizedPeerId),
        online: true,
        trust,
    };
}
function peerIdFromFingerprint(fingerprint) {
    const compact = fingerprint.toLowerCase().replace(/[^a-z0-9]/g, "");
    const suffix = compact.slice(0, 16) || "local";
    return `peer-${suffix}`;
}
