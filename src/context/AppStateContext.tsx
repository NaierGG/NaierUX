import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
import { ACCENT_BY_MODE, type AccentMode } from "../theme/tokens";
import { DEFAULT_SECURITY_PREFERENCES, type SecurityPreferences } from "../state/preferences";

type ThreadActivity = {
  chatId: string;
  text: string;
  fromMe: boolean;
  peerName?: string;
  trust?: TrustState;
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
  setSecurityPreference: <K extends keyof SecurityPreferences>(key: K, value: SecurityPreferences[K]) => void;
  ensureChatForPeer: (peerId: string, peerName: string, trust?: TrustState) => string;
  observePeerKey: (peerId: string, keyId: string, publicKeyHex: string) => void;
  approvePeerKeyChange: (peerId: string) => void;
  markPeerVerified: (peerId: string) => void;
  markChatRead: (chatId: string) => void;
  registerThreadActivity: (activity: ThreadActivity) => void;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  const [peerSecurityHydrated, setPeerSecurityHydrated] = useState(false);
  const [securityPreferences, setSecurityPreferences] = useState<SecurityPreferences>(
    DEFAULT_SECURITY_PREFERENCES,
  );
  const peerKeysRef = useRef<Record<string, KnownPeerKey>>({});
  const trustOverridesRef = useRef<Record<string, TrustState>>({});

  const accent = useMemo(() => ACCENT_BY_MODE[accentMode], [accentMode]);

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
    if (!peerSecurityHydrated) {
      return;
    }
    void savePersistedPeerSecurityState({
      version: 1,
      peerKeys,
      trustOverrides,
    });
  }, [peerKeys, peerSecurityHydrated, trustOverrides]);

  const setSecurityPreference = <K extends keyof SecurityPreferences>(
    key: K,
    value: SecurityPreferences[K],
  ) => {
    setSecurityPreferences((prev) => ({ ...prev, [key]: value }));
  };

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
      setSecurityPreference,
      ensureChatForPeer,
      observePeerKey,
      approvePeerKeyChange,
      markPeerVerified,
      markChatRead,
      registerThreadActivity,
    }),
    [accent, accentMode, chats, contacts, disappearPolicy, messages, peerKeys, route, securityPreferences],
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
