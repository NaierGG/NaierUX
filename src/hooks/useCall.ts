import { useCallback, useEffect, useRef, useState } from "react";
import {
  AuthenticatedWebSocketSignalingAdapter,
  DisabledCallAdapter,
  InMemorySignalingAdapter,
  MockWebRTCCallAdapter,
  WebRTCCallAdapter,
  isCallRuntimeSupported,
} from "../core";
import type { CallAdapter, CallState, RouteMode } from "../core";

export type UseCallResult = {
  callAdapter: CallAdapter | null;
  callState: CallState;
  startCall: (peerId: string, mode: "voice" | "video", route: RouteMode) => Promise<void>;
  endCall: (reason?: string) => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  switchCallRoute: (route: RouteMode) => void;
};

type UseCallOptions = {
  localPeerId: string;
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

function runtimeEnv(name: string): string | undefined {
  try {
    const envObj = (globalThis as any)?.process?.env;
    const direct = envObj?.[name];
    if (typeof direct === "string" && direct.length > 0) {
      return direct;
    }
    const expoPublic = envObj?.[`EXPO_PUBLIC_${name}`];
    if (typeof expoPublic === "string" && expoPublic.length > 0) {
      return expoPublic;
    }
  } catch {
    // Ignore env read errors.
  }
  return undefined;
}

const SIGNAL_SERVER_URL = runtimeEnv("NAIER_SIGNALING_URL");
const SIGNAL_NAMESPACE = runtimeEnv("NAIER_SIGNAL_NAMESPACE") ?? "naier-mesh-v1";
const SIGNAL_AUTH_TOKEN = runtimeEnv("NAIER_SIGNALING_TOKEN")?.trim();
const ALLOW_IN_MEMORY_FALLBACK = runtimeEnv("NAIER_ALLOW_IN_MEMORY") === "1";
const ALLOW_MOCK_CALL = runtimeEnv("NAIER_ALLOW_MOCK_CALL") === "1";

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function buildRtcConfig(): any {
  const configuredStun = parseCsv(runtimeEnv("NAIER_STUN_URLS"));
  const stunUrls = configuredStun.length > 0
    ? configuredStun
    : [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ];
  const turnUrls = parseCsv(runtimeEnv("NAIER_TURN_URLS"));
  const turnUsername = runtimeEnv("NAIER_TURN_USERNAME");
  const turnCredential = runtimeEnv("NAIER_TURN_CREDENTIAL");
  const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    ...stunUrls.map((url) => ({ urls: url })),
  ];
  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }
  return { iceServers };
}

function createCallAdapter(localPeerId: string): CallAdapter {
  if (!localPeerId) {
    return new DisabledCallAdapter("Identity not ready.");
  }

  if (!isCallRuntimeSupported()) {
    if (ALLOW_MOCK_CALL) {
      return new MockWebRTCCallAdapter();
    }
    return new DisabledCallAdapter("This runtime does not support WebRTC media calls.");
  }

  if (SIGNAL_SERVER_URL) {
    if (!SIGNAL_AUTH_TOKEN || SIGNAL_AUTH_TOKEN.length < 16) {
      return new DisabledCallAdapter("Set NAIER_SIGNALING_TOKEN (min 16 chars) to enable calls.");
    }
    const signaling = new AuthenticatedWebSocketSignalingAdapter({
      url: SIGNAL_SERVER_URL,
      authToken: SIGNAL_AUTH_TOKEN,
      namespace: `${SIGNAL_NAMESPACE}-call`,
      onionMode: "tor",
    });
    return new WebRTCCallAdapter(signaling, localPeerId, { rtcConfig: buildRtcConfig() });
  }

  if (ALLOW_IN_MEMORY_FALLBACK) {
    const signaling = new InMemorySignalingAdapter({
      namespace: `${SIGNAL_NAMESPACE}-call`,
      authToken: SIGNAL_AUTH_TOKEN ?? "dev-signaling-secret",
      onionMode: "relay2",
    });
    return new WebRTCCallAdapter(signaling, localPeerId, { rtcConfig: buildRtcConfig() });
  }

  if (ALLOW_MOCK_CALL) {
    return new MockWebRTCCallAdapter();
  }

  return new DisabledCallAdapter("Missing signaling config for calls. Set NAIER_SIGNALING_URL.");
}

export function useCall({ localPeerId }: UseCallOptions): UseCallResult {
  const callAdapterRef = useRef<CallAdapter | null>(null);
  const [callState, setCallState] = useState<CallState>(DEFAULT_CALL_STATE);

  useEffect(() => {
    const nextAdapter = createCallAdapter(localPeerId);
    callAdapterRef.current = nextAdapter;
    const unsubscribe = nextAdapter.subscribe(setCallState);
    return () => {
      unsubscribe();
      nextAdapter.dispose();
      if (callAdapterRef.current === nextAdapter) {
        callAdapterRef.current = null;
      }
    };
  }, [localPeerId]);

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
