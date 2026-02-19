"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPersistedAppState = loadPersistedAppState;
exports.savePersistedAppState = savePersistedAppState;
exports.exportEncryptedAppBackup = exportEncryptedAppBackup;
exports.importEncryptedAppBackup = importEncryptedAppBackup;
const preferences_1 = require("./preferences");
const peer_1 = require("./peer");
const secureJson_1 = require("./secureJson");
const STORAGE_KEY = "naier.app-state.v1";
const DEFAULT_APP_STATE = {
    version: 1,
    route: peer_1.DEFAULT_ROUTE,
    disappearPolicy: peer_1.DEFAULT_POLICY,
    accentMode: "Neon Green",
    messages: [],
    chats: [],
    contacts: [],
    securityPreferences: preferences_1.DEFAULT_SECURITY_PREFERENCES,
    contactRequests: [],
    blockedPeers: [],
};
function isRouteMode(value) {
    return value === "Direct P2P" || value === "2-hop Relay" || value === "Tor";
}
function isDisappearPolicy(value) {
    return value === "5 min" || value === "1 h" || value === "24 h" || value === "30 d";
}
function isAccentMode(value) {
    return value === "Neon Green" || value === "Neon Red" || value === "Highlight Purple" || value === "Cyber Blue";
}
function isTrustState(value) {
    return value === "verified" || value === "unverified" || value === "changed_key";
}
function isDeliveryState(value) {
    return value === "queued_local" || value === "sending" || value === "sent" || value === "failed";
}
function normalizeMessage(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const candidate = value;
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
function normalizeChat(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const candidate = value;
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
function normalizeContact(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const candidate = value;
    const rawPeerId = typeof candidate.peerId === "string" ? candidate.peerId : "";
    const peerId = (0, peer_1.normalizePeerId)(rawPeerId);
    const name = typeof candidate.name === "string" ? candidate.name.trim() : peerId;
    const trust = isTrustState(candidate.trust) ? candidate.trust : "unverified";
    const online = candidate.online === true;
    if (!peerId) {
        return null;
    }
    const base = (0, peer_1.makeContactProfile)(peerId, name, trust);
    return {
        ...base,
        online,
    };
}
function normalizeSecurityPreferences(value) {
    if (!value || typeof value !== "object") {
        return preferences_1.DEFAULT_SECURITY_PREFERENCES;
    }
    const candidate = value;
    return {
        biometricLock: candidate.biometricLock !== false,
        screenshotBlock: candidate.screenshotBlock !== false,
        antiDelete: candidate.antiDelete !== false,
        preferDirectP2P: candidate.preferDirectP2P !== false,
        relayFallback: candidate.relayFallback !== false,
    };
}
function normalizeContactRequest(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const candidate = value;
    const peerId = (0, peer_1.normalizePeerId)(typeof candidate.peerId === "string" ? candidate.peerId : "");
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
function normalizeBlockedPeers(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const seen = new Set();
    value.forEach((entry) => {
        if (typeof entry !== "string") {
            return;
        }
        const peerId = (0, peer_1.normalizePeerId)(entry);
        seen.add(peerId);
    });
    return [...seen];
}
function normalizeState(value) {
    if (!value || typeof value !== "object") {
        return DEFAULT_APP_STATE;
    }
    const candidate = value;
    const route = isRouteMode(candidate.route) ? candidate.route : peer_1.DEFAULT_ROUTE;
    const disappearPolicy = isDisappearPolicy(candidate.disappearPolicy) ? candidate.disappearPolicy : peer_1.DEFAULT_POLICY;
    const accentMode = isAccentMode(candidate.accentMode) ? candidate.accentMode : "Neon Green";
    const messages = Array.isArray(candidate.messages) ? candidate.messages.map(normalizeMessage).filter((item) => Boolean(item)) : [];
    const chats = Array.isArray(candidate.chats) ? candidate.chats.map(normalizeChat).filter((item) => Boolean(item)) : [];
    const contacts = Array.isArray(candidate.contacts) ? candidate.contacts.map(normalizeContact).filter((item) => Boolean(item)) : [];
    const securityPreferences = normalizeSecurityPreferences(candidate.securityPreferences);
    const contactRequests = Array.isArray(candidate.contactRequests)
        ? candidate.contactRequests.map(normalizeContactRequest).filter((item) => Boolean(item))
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
async function loadPersistedAppState() {
    return (0, secureJson_1.loadSecureJson)(STORAGE_KEY, normalizeState, DEFAULT_APP_STATE);
}
async function savePersistedAppState(state) {
    await (0, secureJson_1.saveSecureJson)(STORAGE_KEY, normalizeState(state));
}
async function exportEncryptedAppBackup(state) {
    return (0, secureJson_1.exportSecurePayload)(normalizeState(state));
}
async function importEncryptedAppBackup(payload) {
    return (0, secureJson_1.importSecurePayload)(payload, normalizeState);
}
