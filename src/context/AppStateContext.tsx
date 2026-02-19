import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ChatMessage, ChatPreview, ContactProfile, DisappearPolicy, RouteMode, TrustState } from "../core";
import {
  DEFAULT_POLICY,
  DEFAULT_ROUTE,
  chatIdFromPeerId,
  makeContactProfile,
  normalizePeerId,
} from "../state/peer";
import {
  loadPersistedPeerSecurityState,
  savePersistedPeerSecurityState,
  type KnownPeerKey,
} from "../state/peerSecurity";
import {
  exportEncryptedAppBackup,
  importEncryptedAppBackup,
  loadPersistedAppState,
  savePersistedAppState,
  type ContactRequest,
} from "../state/appStateStore";
import { ACCENT_BY_MODE, type AccentMode } from "../theme/tokens";
import { DEFAULT_SECURITY_PREFERENCES, type SecurityPreferences } from "../state/preferences";

type ThreadActivity = {
  chatId: string;
  text: string;
  fromMe: boolean;
  peerName?: string;
  trust?: TrustState;
};

type BackupImportResult = {
  ok: boolean;
  error?: string;
};

type AppStateContextValue = {
  route: RouteMode;
  setRoute: Dispatch<SetStateAction<RouteMode>>;
  accentMode: AccentMode;
  setAccentMode: Dispatch<SetStateAction<AccentMode>>;
  accent: string;
  disappearPolicy: DisappearPolicy;
  setDisappearPolicy: Dispatch<SetStateAction<DisappearPolicy>>;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  chats: ChatPreview[];
  contacts: ContactProfile[];
  peerKeys: Record<string, KnownPeerKey>;
  securityPreferences: SecurityPreferences;
  contactRequests: ContactRequest[];
  blockedPeers: string[];
  setSecurityPreference: <K extends keyof SecurityPreferences>(key: K, value: SecurityPreferences[K]) => void;
  ensureChatForPeer: (peerId: string, peerName: string, trust?: TrustState) => string;
  observePeerKey: (peerId: string, keyId: string, publicKeyHex: string) => void;
  approvePeerKeyChange: (peerId: string) => void;
  markPeerVerified: (peerId: string) => void;
  markChatRead: (chatId: string) => void;
  registerThreadActivity: (activity: ThreadActivity) => void;
  sendFriendRequest: (peerId: string, name?: string) => void;
  receiveFriendRequest: (peerId: string, name?: string, preview?: string) => void;
  acceptFriendRequest: (peerId: string, name?: string) => string;
  declineFriendRequest: (peerId: string) => void;
  cancelOutgoingFriendRequest: (peerId: string) => void;
  blockPeer: (peerId: string) => void;
  unblockPeer: (peerId: string) => void;
  isPeerBlocked: (peerId: string) => boolean;
  exportBackupPayload: () => Promise<string>;
  importBackupPayload: (payload: string) => Promise<BackupImportResult>;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function upsertContactRequest(
  previous: ContactRequest[],
  nextRequest: ContactRequest,
): ContactRequest[] {
  return [nextRequest, ...previous.filter((request) => request.peerId !== nextRequest.peerId)];
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<RouteMode>(DEFAULT_ROUTE);
  const [accentMode, setAccentMode] = useState<AccentMode>("Neon Green");
  const [disappearPolicy, setDisappearPolicy] = useState<DisappearPolicy>(DEFAULT_POLICY);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [peerKeys, setPeerKeys] = useState<Record<string, KnownPeerKey>>({});
  const [trustOverrides, setTrustOverrides] = useState<Record<string, TrustState>>({});
  const [securityPreferences, setSecurityPreferences] = useState<SecurityPreferences>(DEFAULT_SECURITY_PREFERENCES);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [blockedPeers, setBlockedPeers] = useState<string[]>([]);
  const [peerSecurityHydrated, setPeerSecurityHydrated] = useState(false);
  const [appStateHydrated, setAppStateHydrated] = useState(false);

  const peerKeysRef = useRef<Record<string, KnownPeerKey>>({});
  const trustOverridesRef = useRef<Record<string, TrustState>>({});
  const blockedPeersRef = useRef<string[]>([]);
  const contactRequestsRef = useRef<ContactRequest[]>([]);

  const accent = useMemo(() => ACCENT_BY_MODE[accentMode], [accentMode]);

  useEffect(() => {
    blockedPeersRef.current = blockedPeers;
  }, [blockedPeers]);

  useEffect(() => {
    contactRequestsRef.current = contactRequests;
  }, [contactRequests]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const persisted = await loadPersistedPeerSecurityState();
      if (!active) {
        return;
      }
      peerKeysRef.current = persisted.peerKeys;
      trustOverridesRef.current = persisted.trustOverrides;
      setPeerKeys(persisted.peerKeys);
      setTrustOverrides(persisted.trustOverrides);
      setPeerSecurityHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const persisted = await loadPersistedAppState();
      if (!active) {
        return;
      }
      setRoute(persisted.route);
      setAccentMode(persisted.accentMode);
      setDisappearPolicy(persisted.disappearPolicy);
      setMessages(persisted.messages);
      setChats(persisted.chats);
      setContacts(persisted.contacts);
      setSecurityPreferences(persisted.securityPreferences);
      setContactRequests(persisted.contactRequests);
      setBlockedPeers(persisted.blockedPeers);
      setAppStateHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!peerSecurityHydrated) {
      return;
    }
    void savePersistedPeerSecurityState({
      version: 1,
      peerKeys,
      trustOverrides,
    });
  }, [peerKeys, peerSecurityHydrated, trustOverrides]);

  useEffect(() => {
    if (!appStateHydrated) {
      return;
    }
    void savePersistedAppState({
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
    });
  }, [
    accentMode,
    appStateHydrated,
    blockedPeers,
    chats,
    contactRequests,
    contacts,
    disappearPolicy,
    messages,
    route,
    securityPreferences,
  ]);

  const setSecurityPreference = <K extends keyof SecurityPreferences>(
    key: K,
    value: SecurityPreferences[K],
  ) => {
    setSecurityPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const isPeerBlocked = useCallback((peerId: string): boolean => {
    const normalizedPeerId = normalizePeerId(peerId);
    return blockedPeersRef.current.includes(normalizedPeerId);
  }, []);

  const ensureChatForPeer = (peerId: string, peerName: string, trust: TrustState = "unverified"): string => {
    const normalizedPeerId = normalizePeerId(peerId);
    const chatId = chatIdFromPeerId(normalizedPeerId);
    const effectiveTrust = trustOverridesRef.current[normalizedPeerId] ?? trust;

    setContacts((prev) => {
      if (prev.some((contact) => contact.peerId === normalizedPeerId)) {
        return prev;
      }
      return [...prev, makeContactProfile(normalizedPeerId, peerName || normalizedPeerId, effectiveTrust)];
    });

    setChats((prev) => {
      const existing = prev.find((chat) => chat.id === chatId);
      if (existing) {
        return prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                name: peerName || chat.name,
                trust: effectiveTrust,
              }
            : chat,
        );
      }

      const nextChat: ChatPreview = {
        id: chatId,
        name: peerName || normalizedPeerId,
        lastMessage: "Secure channel initialized.",
        timeLabel: nowLabel(),
        unread: 0,
        trust: effectiveTrust,
      };
      return [nextChat, ...prev];
    });

    return chatId;
  };

  const setTrustForPeer = (peerId: string, trust: TrustState) => {
    const normalizedPeerId = normalizePeerId(peerId);
    const chatId = chatIdFromPeerId(normalizedPeerId);
    const nextTrust = {
      ...trustOverridesRef.current,
      [normalizedPeerId]: trust,
    };
    trustOverridesRef.current = nextTrust;
    setTrustOverrides(nextTrust);
    setContacts((prev) =>
      prev.map((contact) =>
        contact.peerId === normalizedPeerId
          ? {
              ...contact,
              trust,
            }
          : contact,
      ),
    );
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              trust,
            }
          : chat,
      ),
    );
  };

  const observePeerKey = (peerId: string, keyId: string, publicKeyHex: string) => {
    const normalizedPeerId = normalizePeerId(peerId);
    const normalizedKeyId = keyId.trim();
    const normalizedPublicKeyHex = publicKeyHex.trim().toLowerCase();
    if (!normalizedKeyId || !normalizedPublicKeyHex) {
      return;
    }

    const existing = peerKeysRef.current[normalizedPeerId];
    if (!existing) {
      const nextEntry: KnownPeerKey = {
        activeKeyId: normalizedKeyId,
        activePublicKeyHex: normalizedPublicKeyHex,
        updatedAtIso: new Date().toISOString(),
      };
      const nextMap = {
        ...peerKeysRef.current,
        [normalizedPeerId]: nextEntry,
      };
      peerKeysRef.current = nextMap;
      setPeerKeys(nextMap);
      return;
    }

    if (
      existing.activeKeyId === normalizedKeyId &&
      existing.activePublicKeyHex === normalizedPublicKeyHex
    ) {
      return;
    }

    if (existing.pendingKeyId === normalizedKeyId && existing.pendingPublicKeyHex === normalizedPublicKeyHex) {
      return;
    }

    const nextEntry: KnownPeerKey = {
      ...existing,
      pendingKeyId: normalizedKeyId,
      pendingPublicKeyHex: normalizedPublicKeyHex,
      updatedAtIso: new Date().toISOString(),
    };
    const nextMap = {
      ...peerKeysRef.current,
      [normalizedPeerId]: nextEntry,
    };
    peerKeysRef.current = nextMap;
    setPeerKeys(nextMap);
    setTrustForPeer(normalizedPeerId, "changed_key");
  };

  const approvePeerKeyChange = (peerId: string) => {
    const normalizedPeerId = normalizePeerId(peerId);
    const existing = peerKeysRef.current[normalizedPeerId];
    if (!existing || !existing.pendingKeyId || !existing.pendingPublicKeyHex) {
      return;
    }

    const nextEntry: KnownPeerKey = {
      activeKeyId: existing.pendingKeyId,
      activePublicKeyHex: existing.pendingPublicKeyHex,
      updatedAtIso: new Date().toISOString(),
    };
    const nextMap = {
      ...peerKeysRef.current,
      [normalizedPeerId]: nextEntry,
    };
    peerKeysRef.current = nextMap;
    setPeerKeys(nextMap);
    setTrustForPeer(normalizedPeerId, "unverified");
  };

  const markPeerVerified = (peerId: string) => {
    const normalizedPeerId = normalizePeerId(peerId);
    setTrustForPeer(normalizedPeerId, "verified");
  };

  const markChatRead = (chatId: string) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat)),
    );
  };

  const registerThreadActivity = ({ chatId, text, fromMe, peerName, trust }: ThreadActivity) => {
    setChats((prev) => {
      const existing = prev.find((chat) => chat.id === chatId);
      const updated: ChatPreview = existing
        ? {
            ...existing,
            lastMessage: text,
            timeLabel: nowLabel(),
            unread: fromMe ? 0 : existing.unread + 1,
          }
        : {
            id: chatId,
            name: peerName ?? chatId.replace(/^chat-/, ""),
            lastMessage: text,
            timeLabel: nowLabel(),
            unread: fromMe ? 0 : 1,
            trust: trust ?? "unverified",
          };

      return [updated, ...prev.filter((chat) => chat.id !== chatId)];
    });
  };

  const sendFriendRequest = useCallback((peerId: string, name?: string) => {
    const normalizedPeerId = normalizePeerId(peerId);
    if (isPeerBlocked(normalizedPeerId)) {
      return;
    }
    const nextRequest: ContactRequest = {
      peerId: normalizedPeerId,
      name: (name?.trim() || normalizedPeerId),
      direction: "outgoing",
      createdAtIso: new Date().toISOString(),
    };
    setContactRequests((prev) => upsertContactRequest(prev, nextRequest));
  }, [isPeerBlocked]);

  const receiveFriendRequest = useCallback((peerId: string, name?: string, preview?: string) => {
    const normalizedPeerId = normalizePeerId(peerId);
    if (isPeerBlocked(normalizedPeerId)) {
      return;
    }
    if (contacts.some((contact) => contact.peerId === normalizedPeerId)) {
      return;
    }
    const existing = contactRequestsRef.current.find((request) => request.peerId === normalizedPeerId);
    if (existing?.direction === "outgoing") {
      return;
    }
    const nextRequest: ContactRequest = {
      peerId: normalizedPeerId,
      name: (name?.trim() || normalizedPeerId),
      direction: "incoming",
      preview: preview?.slice(0, 120),
      createdAtIso: existing?.createdAtIso ?? new Date().toISOString(),
    };
    setContactRequests((prev) => upsertContactRequest(prev, nextRequest));
  }, [contacts, isPeerBlocked]);

  const acceptFriendRequest = useCallback((peerId: string, name?: string): string => {
    const normalizedPeerId = normalizePeerId(peerId);
    const request = contactRequestsRef.current.find((entry) => entry.peerId === normalizedPeerId);
    setContactRequests((prev) => prev.filter((entry) => entry.peerId !== normalizedPeerId));
    const resolvedName = name?.trim() || request?.name || normalizedPeerId;
    return ensureChatForPeer(normalizedPeerId, resolvedName, "unverified");
  }, [ensureChatForPeer]);

  const declineFriendRequest = useCallback((peerId: string) => {
    const normalizedPeerId = normalizePeerId(peerId);
    setContactRequests((prev) => prev.filter((entry) => entry.peerId !== normalizedPeerId));
  }, []);

  const cancelOutgoingFriendRequest = useCallback((peerId: string) => {
    const normalizedPeerId = normalizePeerId(peerId);
    setContactRequests((prev) => prev.filter((entry) => entry.peerId !== normalizedPeerId));
  }, []);

  const blockPeer = useCallback((peerId: string) => {
    const normalizedPeerId = normalizePeerId(peerId);
    setBlockedPeers((prev) => (prev.includes(normalizedPeerId) ? prev : [normalizedPeerId, ...prev]));
    setContactRequests((prev) => prev.filter((entry) => entry.peerId !== normalizedPeerId));
  }, []);

  const unblockPeer = useCallback((peerId: string) => {
    const normalizedPeerId = normalizePeerId(peerId);
    setBlockedPeers((prev) => prev.filter((entry) => entry !== normalizedPeerId));
  }, []);

  const exportBackupPayload = useCallback(async (): Promise<string> => {
    return exportEncryptedAppBackup({
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
    });
  }, [
    accentMode,
    blockedPeers,
    chats,
    contactRequests,
    contacts,
    disappearPolicy,
    messages,
    route,
    securityPreferences,
  ]);

  const importBackupPayload = useCallback(async (payload: string): Promise<BackupImportResult> => {
    const restored = await importEncryptedAppBackup(payload);
    if (!restored) {
      return {
        ok: false,
        error: "Invalid backup payload.",
      };
    }
    setRoute(restored.route);
    setAccentMode(restored.accentMode);
    setDisappearPolicy(restored.disappearPolicy);
    setMessages(restored.messages);
    setChats(restored.chats);
    setContacts(restored.contacts);
    setSecurityPreferences(restored.securityPreferences);
    setContactRequests(restored.contactRequests);
    setBlockedPeers(restored.blockedPeers);
    return { ok: true };
  }, []);

  const value = useMemo<AppStateContextValue>(
    () => ({
      route,
      setRoute,
      accentMode,
      setAccentMode,
      accent,
      disappearPolicy,
      setDisappearPolicy,
      messages,
      setMessages,
      chats,
      contacts,
      peerKeys,
      securityPreferences,
      contactRequests,
      blockedPeers,
      setSecurityPreference,
      ensureChatForPeer,
      observePeerKey,
      approvePeerKeyChange,
      markPeerVerified,
      markChatRead,
      registerThreadActivity,
      sendFriendRequest,
      receiveFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      cancelOutgoingFriendRequest,
      blockPeer,
      unblockPeer,
      isPeerBlocked,
      exportBackupPayload,
      importBackupPayload,
    }),
    [
      accent,
      accentMode,
      blockedPeers,
      chats,
      contactRequests,
      contacts,
      disappearPolicy,
      messages,
      peerKeys,
      route,
      securityPreferences,
      sendFriendRequest,
      receiveFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      cancelOutgoingFriendRequest,
      blockPeer,
      unblockPeer,
      isPeerBlocked,
      exportBackupPayload,
      importBackupPayload,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppStateContext(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppStateContext must be used within AppStateProvider.");
  }
  return context;
}
