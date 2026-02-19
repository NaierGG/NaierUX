import React, { createContext, useContext, useMemo } from "react";
import type {
  CallState,
  ChatMessage,
  CryptoCapability,
  IdentityProfile,
  MessengerEngine,
  MockWebRTCCallAdapter,
  RouteMode,
  SecurityConfig,
} from "../core";
import { useCall } from "../hooks/useCall";
import { useEngine, type SendMessageInput } from "../hooks/useEngine";

type EngineContextValue = {
  engine: MessengerEngine | null;
  callAdapter: MockWebRTCCallAdapter | null;
  identity: IdentityProfile;
  recoveryWords: string[];
  phraseValid: boolean;
  cryptoCapability: CryptoCapability;
  initError: string | null;
  activeNetworkName: string;
  inFlightCount: number;
  signalingMode: "ws-auth" | "in-memory-auth";
  securityBootstrap: SecurityConfig;
  sendMessage: (input: SendMessageInput) => Promise<ChatMessage>;
  setNetworkRoute: (route: RouteMode) => void;
  callState: CallState;
  startCall: (peerId: string, mode: "voice" | "video", route: RouteMode) => Promise<void>;
  endCall: (reason?: string) => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  switchCallRoute: (route: RouteMode) => void;
};

const EngineContext = createContext<EngineContextValue | null>(null);

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const {
    engine,
    identity,
    recoveryWords,
    phraseValid,
    cryptoCapability,
    initError,
    activeNetworkName,
    inFlightCount,
    securityBootstrap,
    signalingMode,
    sendMessage,
    setNetworkRoute,
  } = useEngine();

  const {
    callAdapter,
    callState,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    switchCallRoute,
  } = useCall();

  const value = useMemo<EngineContextValue>(
    () => ({
      engine,
      callAdapter,
      identity,
      recoveryWords,
      phraseValid,
      cryptoCapability,
      initError,
      activeNetworkName,
      inFlightCount,
      signalingMode,
      securityBootstrap,
      sendMessage,
      setNetworkRoute,
      callState,
      startCall,
      endCall,
      toggleMute,
      toggleCamera,
      toggleSpeaker,
      switchCallRoute,
    }),
    [
      activeNetworkName,
      callAdapter,
      callState,
      cryptoCapability,
      endCall,
      engine,
      identity,
      inFlightCount,
      initError,
      phraseValid,
      recoveryWords,
      securityBootstrap,
      sendMessage,
      setNetworkRoute,
      signalingMode,
      startCall,
      switchCallRoute,
      toggleCamera,
      toggleMute,
      toggleSpeaker,
    ],
  );

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngineContext(): EngineContextValue {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error("useEngineContext must be used within EngineProvider.");
  }
  return context;
}
