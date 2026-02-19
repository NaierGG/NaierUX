import { useCallback, useEffect, useRef, useState } from "react";
import { MockWebRTCCallAdapter } from "../core";
import type { CallState, RouteMode } from "../core";

export type UseCallResult = {
  callAdapter: MockWebRTCCallAdapter | null;
  callState: CallState;
  startCall: (peerId: string, mode: "voice" | "video", route: RouteMode) => Promise<void>;
  endCall: (reason?: string) => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  switchCallRoute: (route: RouteMode) => void;
};

const DEFAULT_CALL_STATE: CallState = {
  phase: "idle",
  mode: "voice",
  peerId: null,
  route: "Direct P2P",
  encrypted: true,
  muted: false,
  cameraEnabled: true,
  speakerEnabled: true,
  latencyMs: 0,
  bars: 0,
  jitterMs: 0,
  packetLossPct: 0,
  durationSec: 0,
};

export function useCall(): UseCallResult {
  const callAdapterRef = useRef<MockWebRTCCallAdapter | null>(null);
  if (!callAdapterRef.current) {
    callAdapterRef.current = new MockWebRTCCallAdapter();
  }

  const [callState, setCallState] = useState<CallState>(
    callAdapterRef.current.getState?.() ?? DEFAULT_CALL_STATE,
  );

  useEffect(() => {
    const adapter = callAdapterRef.current;
    if (!adapter) {
      return;
    }

    const unsubscribe = adapter.subscribe(setCallState);
    return () => {
      unsubscribe();
      adapter.dispose();
    };
  }, []);

  const startCall = useCallback(
    async (peerId: string, mode: "voice" | "video", route: RouteMode) => {
      await callAdapterRef.current?.startCall(peerId, mode, route);
    },
    [],
  );

  const endCall = useCallback(async (reason?: string) => {
    await callAdapterRef.current?.endCall(reason);
  }, []);

  const toggleMute = useCallback(() => {
    callAdapterRef.current?.toggleMute();
  }, []);

  const toggleCamera = useCallback(() => {
    callAdapterRef.current?.toggleCamera();
  }, []);

  const toggleSpeaker = useCallback(() => {
    callAdapterRef.current?.toggleSpeaker();
  }, []);

  const switchCallRoute = useCallback((route: RouteMode) => {
    callAdapterRef.current?.switchRoute(route);
  }, []);

  return {
    callAdapter: callAdapterRef.current,
    callState,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    switchCallRoute,
  };
}
