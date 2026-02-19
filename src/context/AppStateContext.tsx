import React, { createContext, useContext, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ChatMessage, DisappearPolicy, RouteMode } from "../core";
import { CHAT_MESSAGES, DEFAULT_POLICY, DEFAULT_ROUTE } from "../state/mockData";
import { ACCENT_BY_MODE, type AccentMode } from "../theme/tokens";

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
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<RouteMode>(DEFAULT_ROUTE);
  const [accentMode, setAccentMode] = useState<AccentMode>("Neon Green");
  const [disappearPolicy, setDisappearPolicy] = useState<DisappearPolicy>(DEFAULT_POLICY);
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_MESSAGES);

  const accent = useMemo(() => ACCENT_BY_MODE[accentMode], [accentMode]);

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
    }),
    [accent, accentMode, disappearPolicy, messages, route],
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
