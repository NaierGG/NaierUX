import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getRouteStatus, type DisappearPolicy } from "../core";
import { useAppStateContext } from "../context/AppStateContext";
import { useEngineContext } from "../context/EngineContext";
import { useMessages } from "../hooks/useMessages";
import { BackupScreen } from "../screens/BackupScreen";
import { CallScreen } from "../screens/CallScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ContactsScreen } from "../screens/ContactsScreen";
import { GroupScreen } from "../screens/GroupScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { NewChatScreen } from "../screens/NewChatScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RecoveryScreen } from "../screens/RecoveryScreen";
import { SettingsScreen, type DisappearSelection } from "../screens/SettingsScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { AppearanceScreen } from "../screens/AppearanceScreen";
import { BottomNav, type BottomNavItem } from "../components/BottomNav";
import { StatusBar } from "../components/StatusBar";
import type { RootStackParamList } from "./types";
import { COLORS, nextRouteMode } from "../theme/tokens";

const Stack = createNativeStackNavigator<RootStackParamList>();
const ACTIVE_PEER_ID = "peer-astra";
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

function policyToSelection(policy: DisappearPolicy): DisappearSelection {
  if (policy === "5 min") return "5 minutes";
  if (policy === "1 h") return "1 hour";
  if (policy === "24 h") return "24 hours";
  return "7 days";
}

function selectionToPolicy(selection: DisappearSelection): DisappearPolicy | null {
  if (selection === "5 minutes") return "5 min";
  if (selection === "1 hour") return "1 h";
  if (selection === "24 hours") return "24 h";
  if (selection === "7 days") return "30 d";
  return null;
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
  } = useAppStateContext();

  const {
    identity,
    recoveryWords,
    phraseValid,
    cryptoCapability,
    initError,
    activeNetworkName,
    inFlightCount,
    sendMessage,
    setNetworkRoute,
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

  const [disappearSelection, setDisappearSelection] = useState<DisappearSelection>(
    policyToSelection(disappearPolicy),
  );

  useEffect(() => {
    setDisappearSelection(policyToSelection(disappearPolicy));
  }, [disappearPolicy]);

  useEffect(() => {
    setNetworkRoute(route);
    switchCallRoute(route);
  }, [route, setNetworkRoute, switchCallRoute]);

  const { messages: localMessages, draft, setDraft, sending, sendDraft } = useMessages({
    route,
    disappearPolicy,
    sendMessage,
    cryptoScheme: cryptoCapability.scheme,
    messages,
    setMessages,
  });

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

  const onSendCurrentDraft = useCallback(
    async (chatId: string, peerId: string) => {
      await sendDraft({ chatId, peerId });
    },
    [sendDraft],
  );

  const onChangeDisappearSelection = useCallback(
    (selection: DisappearSelection) => {
      setDisappearSelection(selection);
      const mapped = selectionToPolicy(selection);
      if (mapped) {
        setDisappearPolicy(mapped);
      }
    },
    [setDisappearPolicy],
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
                onSetRoute={setRoute}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="NewChat">{(props) => <NewChatScreen {...props} accent={accent} />}</Stack.Screen>
          <Stack.Screen name="Chat">
            {(props) => (
              <ChatScreen
                {...props}
                routeMode={route}
                routeStatus={routeStatus}
                onSetRoute={setRoute}
                disappearPolicy={disappearPolicy}
                onSetDisappearPolicy={setDisappearPolicy}
                inFlightCount={inFlightCount}
                activeNetworkName={activeNetworkName}
                initError={initError}
                messages={localMessages}
                draft={draft}
                onDraftChange={setDraft}
                sending={sending}
                accent={accent}
                onSendCurrentDraft={onSendCurrentDraft}
                callState={callState}
                onStartSecureCall={startSecureCall}
                onEndSecureCall={async () => {
                  await endCall("local_end");
                }}
                onToggleMute={toggleMute}
                onToggleCamera={toggleCamera}
                onToggleSpeaker={toggleSpeaker}
                onSwitchRoute={onSwitchRoute}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Group">{(props) => <GroupScreen {...props} accent={accent} />}</Stack.Screen>
          <Stack.Screen name="Call">
            {(props) => (
              <CallScreen
                {...props}
                callState={callState}
                onStartSecureCall={startSecureCall}
                onEndSecureCall={async () => {
                  await endCall("local_end");
                }}
                onToggleMute={toggleMute}
                onToggleCamera={toggleCamera}
                onToggleSpeaker={toggleSpeaker}
                onSwitchRoute={onSwitchRoute}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Contacts" component={ContactsScreen} />
          <Stack.Screen name="Profile">
            {(props) => (
              <ProfileScreen {...props} identity={identity} cryptoCapability={cryptoCapability} />
            )}
          </Stack.Screen>
          <Stack.Screen name="Settings">
            {(props) => (
              <SettingsScreen
                {...props}
                disappearSelection={disappearSelection}
                onChangeDisappearSelection={onChangeDisappearSelection}
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
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0,255,136,0.10)",
    top: -80,
    left: -70,
  },
  purpleGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(124,58,237,0.12)",
    top: -90,
    right: -70,
  },
});
