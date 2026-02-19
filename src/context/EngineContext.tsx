import React, { createContext, useContext, useMemo } from "react";
import type {
  CallAdapter,
  CallState,
  ChatMessage,
  CryptoCapability,
  IdentityProfile,
  MessengerEngine,
  RouteMode,
  SecurityConfig,
} from "../core";
import { useCall } from "../hooks/useCall";
import {
  useEngine,
  type IncomingPacketPayload,
  type PeerKeyEventPayload,
  type RestoreIdentityResult,
  type SendMessageInput,
} from "../hooks/useEngine";

type EngineContextValue = {
  engine: MessengerEngine | null;
  callAdapter: CallAdapter | null;
  identity: IdentityProfile;
  localPeerId: string;
  recoveryWords: string[];
  phraseValid: boolean;
  identityReady: boolean;
  cryptoCapability: CryptoCapability;
  initError: string | null;
  activeNetworkName: string;
  inFlightCount: number;
  signalingMode: "ws-auth" | "in-memory-auth";
  securityBootstrap: SecurityConfig;
  sendMessage: (input: SendMessageInput) => Promise<ChatMessage>;
  setNetworkRoute: (route: RouteMode) => void;
  subscribeIncoming: (handler: (payload: IncomingPacketPayload) => void) => () => void;
  subscribePeerKeys: (handler: (event: PeerKeyEventPayload) => void) => () => void;
  restoreIdentityFromPhrase: (phraseInput: string) => Promise<RestoreIdentityResult>;
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
    localPeerId,
    recoveryWords,
    phraseValid,
    identityReady,
    cryptoCapability,
    initError,
    activeNetworkName,
    inFlightCount,
    securityBootstrap,
    signalingMode,
    sendMessage,
    setNetworkRoute,
    subscribeIncoming,
    subscribePeerKeys,
    restoreIdentityFromPhrase,
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
  } = useCall({ localPeerId });

  const value = useMemo<EngineContextValue>(
    () => ({
      engine,
      callAdapter,
      identity,
      localPeerId,
      recoveryWords,
      phraseValid,
      identityReady,
      cryptoCapability,
      initError,
      activeNetworkName,
      inFlightCount,
      signalingMode,
      securityBootstrap,
      sendMessage,
      setNetworkRoute,
      subscribeIncoming,
      subscribePeerKeys,
      restoreIdentityFromPhrase,
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
      localPeerId,
      inFlightCount,
      initError,
      identityReady,
      phraseValid,
      recoveryWords,
      restoreIdentityFromPhrase,
      securityBootstrap,
      sendMessage,
      setNetworkRoute,
      subscribeIncoming,
      subscribePeerKeys,
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
