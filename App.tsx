import React, { useState } from "react";
import { StatusBar as NativeStatusBar } from "react-native";
import { DarkTheme, NavigationContainer, useNavigationContainerRef, type Theme } from "@react-navigation/native";
import { AppStateProvider } from "./src/context/AppStateContext";
import { EngineProvider } from "./src/context/EngineContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import type { RootStackParamList } from "./src/navigation/types";
import { COLORS } from "./src/theme/tokens";

const NAV_DARK_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.accentMain,
    background: COLORS.bg0,
    card: COLORS.bg0,
    text: COLORS.textPrimary,
    border: COLORS.cardBorder,
    notification: COLORS.accentAlert,
  },
};

function resolveRouteName(name: string | undefined): keyof RootStackParamList {
  if (name === "Splash") return "Splash";
  if (name === "Recovery") return "Recovery";
  if (name === "Home") return "Home";
  if (name === "NewChat") return "NewChat";
  if (name === "Chat") return "Chat";
  if (name === "Group") return "Group";
  if (name === "Call") return "Call";
  if (name === "Contacts") return "Contacts";
  if (name === "Profile") return "Profile";
  if (name === "Settings") return "Settings";
  if (name === "Appearance") return "Appearance";
  if (name === "Backup") return "Backup";
  return "Splash";
}

export default function App() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [currentRouteName, setCurrentRouteName] = useState<keyof RootStackParamList>("Splash");

  return (
    <AppStateProvider>
      <EngineProvider>
        <NativeStatusBar barStyle="light-content" backgroundColor={COLORS.bg0} />
        <NavigationContainer
          theme={NAV_DARK_THEME}
          ref={navigationRef}
          onReady={() => setCurrentRouteName(resolveRouteName(navigationRef.getCurrentRoute()?.name))}
          onStateChange={() => setCurrentRouteName(resolveRouteName(navigationRef.getCurrentRoute()?.name))}
        >
          <AppNavigator navigationRef={navigationRef} currentRouteName={currentRouteName} />
        </NavigationContainer>
      </EngineProvider>
    </AppStateProvider>
  );
}
