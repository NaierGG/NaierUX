import React, { useCallback, useEffect, useMemo } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getRouteStatus, type ChatMessage } from "../core";
import { useAppStateContext } from "../context/AppStateContext";
import { useEngineContext } from "../context/EngineContext";
import { useMessages } from "../hooks/useMessages";
import { chatIdFromPeerId, normalizePeerId, peerIdFromChatId } from "../state/peer";
import { BackupScreen } from "../screens/BackupScreen";
import { CallScreen } from "../screens/CallScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ContactsScreen } from "../screens/ContactsScreen";
import { GroupScreen } from "../screens/GroupScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { NewChatScreen } from "../screens/NewChatScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RecoveryScreen } from "../screens/RecoveryScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { AppearanceScreen } from "../screens/AppearanceScreen";
import { BottomNav, type BottomNavItem } from "../components/BottomNav";
import { StatusBar } from "../components/StatusBar";
import type { RootStackParamList } from "./types";
import { COLORS, nextRouteMode } from "../theme/tokens";

const Stack = createNativeStackNavigator<RootStackParamList>();
const ACTIVE_PEER_ID = "peer-ops";
const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: "transparent" },
} as const;

type AppNavigatorProps = {
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
  currentRouteName: keyof RootStackParamList;
};

function mapRouteToBottomItem(routeName: keyof RootStackParamList): BottomNavItem {
  if (routeName === "Contacts") return "Contacts";
  if (routeName === "Call") return "Calls";
  if (routeName === "Group") return "Groups";
  if (routeName === "Settings" || routeName === "Appearance" || routeName === "Backup" || routeName === "Profile") {
    return "Settings";
  }
  return "Chats";
}

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function keyPreview(publicKeyHex: string | undefined): string | null {
  if (!publicKeyHex) {
    return null;
  }
  const normalized = publicKeyHex.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  return `${normalized.slice(0, 8)}:${normalized.slice(8, 16)}`;
}

export function AppNavigator({ navigationRef, currentRouteName }: AppNavigatorProps) {
  const {
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
  } = useAppStateContext();

  const {
    identity,
    localPeerId,
    recoveryWords,
    phraseValid,
    cryptoCapability,
    initError,
    sendMessage,
    setNetworkRoute,
    subscribeIncoming,
    subscribePeerKeys,
    callState,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    switchCallRoute,
  } = useEngineContext();

  const routeStatus = useMemo(() => getRouteStatus(route), [route]);
  const showBottomNav = currentRouteName !== "Splash" && currentRouteName !== "Recovery";
  const activeBottomItem = useMemo(() => mapRouteToBottomItem(currentRouteName), [currentRouteName]);



  useEffect(() => {
    setNetworkRoute(route);
    switchCallRoute(route);
  }, [route, setNetworkRoute, switchCallRoute]);

  const { messages: localMessages, draft, setDraft, sending, sendDraft, retryMessage } = useMessages({
    route,
    disappearPolicy,
    sendMessage,
    cryptoScheme: cryptoCapability.scheme,
    messages,
    setMessages,
    onThreadActivity: registerThreadActivity,
  });

  const contactsByPeerId = useMemo(() => {
    return new Map(contacts.map((contact) => [contact.peerId, contact]));
  }, [contacts]);

  useEffect(() => {
    return subscribeIncoming(({ fromPeerId, plaintext, packetId }) => {
      const normalizedPeerId = normalizePeerId(fromPeerId);
      const knownContact = contactsByPeerId.get(normalizedPeerId);
      const peerName = knownContact?.name ?? normalizedPeerId;
      const trust = knownContact?.trust ?? "unverified";
      const chatId = ensureChatForPeer(normalizedPeerId, peerName, trust);

      const incoming: ChatMessage = {
        id: `msg-in-${packetId}`,
        chatId,
        text: plaintext,
        fromMe: false,
        sentAtLabel: nowLabel(),
        delivery: "sent",
        cipherSuite: cryptoCapability.scheme,
      };

      setMessages((prev) => {
        if (prev.some((message) => message.id === incoming.id)) {
          return prev;
        }
        return [...prev, incoming];
      });

      registerThreadActivity({
        chatId,
        text: plaintext,
        fromMe: false,
        peerName,
        trust,
      });
    });
  }, [contactsByPeerId, cryptoCapability.scheme, ensureChatForPeer, registerThreadActivity, setMessages, subscribeIncoming]);

  useEffect(() => {
    return subscribePeerKeys(({ peerId, keyId, publicKeyHex }) => {
      const normalizedPeerId = normalizePeerId(peerId);
      const knownContact = contactsByPeerId.get(normalizedPeerId);
      const peerName = knownContact?.name ?? normalizedPeerId;
      const trust = knownContact?.trust ?? "unverified";
      ensureChatForPeer(normalizedPeerId, peerName, trust);
      observePeerKey(normalizedPeerId, keyId, publicKeyHex);
    });
  }, [contactsByPeerId, ensureChatForPeer, observePeerKey, subscribePeerKeys]);

  const startSecureCall = useCallback(
    async (peerId: string, mode: "voice" | "video") => {
      await startCall(peerId, mode, route);
    },
    [route, startCall],
  );

  const onSwitchRoute = useCallback(() => {
    setRoute((prev) => nextRouteMode(prev));
  }, [setRoute]);

  const onNavigateBottom = useCallback(
    (item: BottomNavItem) => {
      if (!navigationRef.isReady()) {
        return;
      }
      if (item === "Chats") {
        navigationRef.navigate("Home");
        return;
      }
      if (item === "Contacts") {
        navigationRef.navigate("Contacts");
        return;
      }
      if (item === "Calls") {
        navigationRef.navigate("Call", { peerId: ACTIVE_PEER_ID, mode: "voice" });
        return;
      }
      if (item === "Groups") {
        navigationRef.navigate("Group", { groupId: "group-ops-mesh" });
        return;
      }
      navigationRef.navigate("Settings");
    },
    [navigationRef],
  );

  const onOpenChat = useCallback(
    (peerId: string, peerName: string, trust: "verified" | "unverified" | "changed_key" = "unverified") => {
      const normalizedPeerId = normalizePeerId(peerId);
      const resolvedPeerName = peerName.trim() || normalizedPeerId;
      const chatId = ensureChatForPeer(normalizedPeerId, resolvedPeerName, trust);
      markChatRead(chatId);
      if (navigationRef.isReady()) {
        navigationRef.navigate("Chat", {
          peerId: normalizedPeerId,
          peerName: resolvedPeerName,
        });
      }
    },
    [ensureChatForPeer, markChatRead, navigationRef],
  );

  const onOpenChatFromChatId = useCallback(
    (chatId: string, peerName: string) => {
      const peerId = peerIdFromChatId(chatId);
      const trust = chats.find((chat) => chat.id === chatId)?.trust ?? "unverified";
      onOpenChat(peerId, peerName, trust);
    },
    [chats, onOpenChat],
  );

  const onSendCurrentDraft = useCallback(
    async (_chatId: string, peerId: string, peerName?: string) => {
      const normalizedPeerId = normalizePeerId(peerId);
      const knownContact = contactsByPeerId.get(normalizedPeerId);
      const resolvedName = (peerName && peerName.trim()) || knownContact?.name || normalizedPeerId;
      const resolvedTrust = knownContact?.trust ?? "unverified";
      if (resolvedTrust === "changed_key") {
        throw new Error("Peer key changed. Approve new key before sending messages.");
      }
      const chatId = ensureChatForPeer(normalizedPeerId, resolvedName, resolvedTrust);
      await sendDraft({ chatId, peerId: normalizedPeerId });
    },
    [contactsByPeerId, ensureChatForPeer, sendDraft],
  );

  const onRetryCurrentMessage = useCallback(
    async (messageId: string, peerId: string) => {
      const normalizedPeerId = normalizePeerId(peerId);
      const chatId = chatIdFromPeerId(normalizedPeerId);
      await retryMessage({ messageId, chatId, peerId: normalizedPeerId });
    },
    [retryMessage],
  );



  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.gradientLayer}>
        <View style={styles.greenGlow} />
        <View style={styles.purpleGlow} />
      </View>

      <StatusBar />

      <View style={styles.appShell}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={STACK_SCREEN_OPTIONS}
        >
          <Stack.Screen name="Splash">{(props) => <SplashScreen {...props} accent={accent} />}</Stack.Screen>
          <Stack.Screen name="Recovery">
            {(props) => (
              <RecoveryScreen
                {...props}
                accent={accent}
                recoveryWords={recoveryWords}
                phraseValid={phraseValid}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Home">
            {(props) => (
              <HomeScreen
                {...props}
                accent={accent}
                routeMode={route}
                routeStatus={routeStatus}
                chats={chats}
                activeChatId={chats[0]?.id ?? ""}
                onSetRoute={setRoute}
                onPressChat={(chatId: string) => {
                  const chat = chats.find((c) => c.id === chatId);
                  if (chat) onOpenChatFromChatId(chatId, chat.name);
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="NewChat">
            {(props) => (
              <NewChatScreen
                {...props}
                accent={accent}
                contacts={contacts}
                onStartChat={onOpenChat}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Chat">
            {(props) => {
              const peerId = normalizePeerId(props.route.params.peerId);
              const activeChatId = chatIdFromPeerId(peerId);
              const threadMessages = localMessages.filter((message) => message.chatId === activeChatId);
              const currentContact = contactsByPeerId.get(peerId);
              const trustState = currentContact?.trust ?? "unverified";
              const peerKeyState = peerKeys[peerId];
              const activeKeyPreview = keyPreview(peerKeyState?.activePublicKeyHex);
              const pendingKeyPreview = keyPreview(peerKeyState?.pendingPublicKeyHex);
              const sendBlockedReason =
                trustState === "changed_key"
                  ? "Peer key changed. Approve the new key before sending."
                  : null;

              return (
                <ChatScreen
                  {...props}
                  routeMode={route}
                  routeStatus={routeStatus}
                  onSetRoute={setRoute}
                  disappearPolicy={disappearPolicy}
                  onSetDisappearPolicy={setDisappearPolicy}
                  initError={initError}
                  chatMessages={threadMessages}
                  draft={draft}
                  onDraftChange={setDraft}
                  sending={sending}
                  accent={accent}
                  securityPrefs={securityPreferences}
                  trustState={trustState}
                  activePeerKeyPreview={activeKeyPreview}
                  pendingPeerKeyPreview={pendingKeyPreview}
                  sendBlockedReason={sendBlockedReason}
                  onMarkPeerVerified={() => markPeerVerified(peerId)}
                  onApprovePeerKeyChange={() => approvePeerKeyChange(peerId)}
                  onSendCurrentDraft={(chatId, targetPeerId) =>
                    onSendCurrentDraft(chatId, targetPeerId, props.route.params.peerName)
                  }
                  onRetryMessage={(messageId: string) => {
                    void onRetryCurrentMessage(messageId, peerId);
                  }}
                  callState={callState}
                  onStartVoice={() => void startSecureCall(peerId, "voice")}
                  onStartVideo={() => void startSecureCall(peerId, "video")}
                  onEndCall={async () => { await endCall("local_end"); }}
                  onToggleMute={toggleMute}
                  onToggleCamera={toggleCamera}
                  onToggleSpeaker={toggleSpeaker}
                  onSwitchRoute={onSwitchRoute}
                />
              );
            }}
          </Stack.Screen>
          <Stack.Screen name="Group">{(props) => <GroupScreen {...props} accent={accent} />}</Stack.Screen>
          <Stack.Screen name="Call">
            {(props) => (
              <CallScreen
                {...props}
                routeMode={route}
                routeStatus={routeStatus}
                accent={accent}
                callState={callState}
                onStartVoice={() => void startSecureCall(props.route.params.peerId, "voice")}
                onStartVideo={() => void startSecureCall(props.route.params.peerId, "video")}
                onEndCall={async () => { await endCall("local_end"); }}
                onToggleMute={toggleMute}
                onToggleCamera={toggleCamera}
                onToggleSpeaker={toggleSpeaker}
                onSwitchRoute={onSwitchRoute}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Contacts">
            {(props) => (
              <ContactsScreen
                contacts={contacts}
                accent={accent}
                onStartChat={onOpenChat}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Profile">
            {(props) => (
              <ProfileScreen
                {...props}
                accent={accent}
                fingerprint={identity?.publicFingerprint ?? "N/A"}
                peerId={localPeerId}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Settings">
            {(props) => (
              <SettingsScreen
                {...props}
                accent={accent}
                securityPrefs={securityPreferences}
                onToggleBiometricLock={() => setSecurityPreference("biometricLock", !securityPreferences.biometricLock)}
                onToggleScreenshotBlock={() => setSecurityPreference("screenshotBlock", !securityPreferences.screenshotBlock)}
                onToggleAntiDelete={() => setSecurityPreference("antiDelete", !securityPreferences.antiDelete)}
                routeMode={route}
                onSetRoute={setRoute}
                disappearPolicy={disappearPolicy}
                onSetDisappearPolicy={setDisappearPolicy}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Appearance">
            {(props) => (
              <AppearanceScreen
                {...props}
                accentMode={accentMode}
                onSetAccentMode={setAccentMode}
                accent={accent}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Backup" component={BackupScreen} />
        </Stack.Navigator>
      </View>

      {showBottomNav ? (
        <BottomNav activeItem={activeBottomItem} accent={accent} onNavigate={onNavigateBottom} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg0,
  },
  appShell: {
    flex: 1,
    backgroundColor: "transparent",
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg0,
  },
  greenGlow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(0,255,136,0.06)",
    top: -100,
    left: -80,
  },
  purpleGlow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(124,58,237,0.07)",
    top: -100,
    right: -80,
  },
});
