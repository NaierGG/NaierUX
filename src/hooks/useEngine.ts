import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AuthenticatedWebSocketSignalingAdapter,
  InMemoryP2PAdapter,
  InMemorySignalingAdapter,
  MessengerEngine,
  WebRTCP2PAdapter,
  configureSecurityFromEnvironment,
  createLocalKeyAgreement,
  createIdentityProfile,
  establishSession,
  generateRecoveryPhrase,
  getCryptoCapability,
  isWebRTCSupported,
  validateRecoveryPhrase,
} from "../core";
import type {
  ChatMessage,
  CryptoCapability,
  DisappearPolicy,
  IdentityProfile,
  PeerKeyEvent,
  NetworkAdapter,
  RouteMode,
  SecurityConfig,
} from "../core";
import { peerIdFromFingerprint } from "../state/peer";

export type SendMessageInput = {
  chatId: string;
  toPeerId: string;
  text: string;
  route: RouteMode;
  disappearPolicy?: DisappearPolicy;
};

export type IncomingPacketPayload = {
  fromPeerId: string;
  plaintext: string;
  packetId: string;
};

export type PeerKeyEventPayload = PeerKeyEvent;

export type UseEngineResult = {
  engine: MessengerEngine | null;
  identity: IdentityProfile;
  localPeerId: string;
  recoveryWords: string[];
  phraseValid: boolean;
  cryptoCapability: CryptoCapability;
  initError: string | null;
  activeNetworkName: string;
  inFlightCount: number;
  securityBootstrap: SecurityConfig;
  signalingMode: "ws-auth" | "in-memory-auth";
  sendMessage: (input: SendMessageInput) => Promise<ChatMessage>;
  setNetworkRoute: (route: RouteMode) => void;
  subscribeIncoming: (handler: (payload: IncomingPacketPayload) => void) => () => void;
  subscribePeerKeys: (handler: (event: PeerKeyEventPayload) => void) => () => void;
};

const SECURITY_BOOTSTRAP = configureSecurityFromEnvironment();

function runtimeEnv(name: string): string | undefined {
  try {
    const envObj = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const direct = envObj?.[name];
    if (typeof direct === "string" && direct.length > 0) {
      return direct;
    }
    const expoPublic = envObj?.[`EXPO_PUBLIC_${name}`];
    if (typeof expoPublic === "string" && expoPublic.length > 0) {
      return expoPublic;
    }
  } catch {
    // Ignore runtime env read errors.
  }
  return undefined;
}

const SIGNAL_SERVER_URL = runtimeEnv("NAIER_SIGNALING_URL");
const SIGNAL_AUTH_TOKEN = runtimeEnv("NAIER_SIGNALING_TOKEN") ?? "dev-signaling-secret";
const SIGNAL_NAMESPACE = runtimeEnv("NAIER_SIGNAL_NAMESPACE") ?? "naier-mesh-v1";
const ALLOW_IN_MEMORY_FALLBACK = runtimeEnv("NAIER_ALLOW_IN_MEMORY") === "1";
const SIGNALING_MODE: "ws-auth" | "in-memory-auth" = SIGNAL_SERVER_URL ? "ws-auth" : "in-memory-auth";

function countInFlight(engine: MessengerEngine | null): number {
  if (!engine) {
    return 0;
  }
  return engine
    .getQueueSnapshot()
    .filter((envelope) => envelope.state === "queued_local" || envelope.state === "sending").length;
}

function buildNetworkAdapter(): NetworkAdapter {
  if (isWebRTCSupported()) {
    if (SIGNAL_SERVER_URL) {
      const signaling = new AuthenticatedWebSocketSignalingAdapter({
        url: SIGNAL_SERVER_URL,
        authToken: SIGNAL_AUTH_TOKEN,
        namespace: SIGNAL_NAMESPACE,
        onionMode: "tor",
      });
      return new WebRTCP2PAdapter(signaling, {
        reconnectMaxAttempts: 6,
        reconnectBaseDelayMs: 400,
        candidatePolicyByRoute: {
          "Direct P2P": "all",
          "2-hop Relay": "relay",
          Tor: "relay",
        },
        renegotiateOnRouteSwitch: true,
      });
    }

    if (ALLOW_IN_MEMORY_FALLBACK) {
      const signaling = new InMemorySignalingAdapter({
        namespace: SIGNAL_NAMESPACE,
        authToken: SIGNAL_AUTH_TOKEN,
        onionMode: "relay2",
      });
      return new WebRTCP2PAdapter(signaling, {
        reconnectMaxAttempts: 4,
        reconnectBaseDelayMs: 300,
        candidatePolicyByRoute: {
          "Direct P2P": "all",
          "2-hop Relay": "all",
          Tor: "relay",
        },
        renegotiateOnRouteSwitch: true,
      });
    }

    throw new Error("Missing NAIER_SIGNALING_URL. Configure a signaling server for real peer messaging.");
  }

  if (ALLOW_IN_MEMORY_FALLBACK) {
    return new InMemoryP2PAdapter();
  }

  throw new Error(
    "WebRTC runtime unavailable. Use web runtime or install native WebRTC support. Set NAIER_ALLOW_IN_MEMORY=1 only for local demo fallback.",
  );
}

export function useEngine(): UseEngineResult {
  const [engine, setEngine] = useState<MessengerEngine | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeNetworkName, setActiveNetworkName] = useState("Unavailable");
  const [inFlightCount, setInFlightCount] = useState(0);

  const networkAdapterRef = useRef<NetworkAdapter | null>(null);
  const engineRef = useRef<MessengerEngine | null>(null);

  const recoveryWords = useMemo(() => generateRecoveryPhrase(12), []);
  const identity = useMemo(() => createIdentityProfile("Naier User", recoveryWords), [recoveryWords]);
  const localPeerId = useMemo(() => peerIdFromFingerprint(identity.publicFingerprint), [identity.publicFingerprint]);
  const phraseValid = useMemo(() => validateRecoveryPhrase(recoveryWords), [recoveryWords]);
  const cryptoCapability = useMemo(() => getCryptoCapability(), []);

  const syncInFlightCount = useCallback(() => {
    setInFlightCount(countInFlight(engineRef.current));
  }, []);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      try {
        const localAdapter = buildNetworkAdapter();
        const localAgreement = await createLocalKeyAgreement(identity.publicFingerprint);
        const secureEngine = new MessengerEngine(
          establishSession(identity.publicFingerprint),
          localAdapter,
          localPeerId,
          localAgreement,
        );

        networkAdapterRef.current = localAdapter;
        await secureEngine.start();

        if (!active) {
          await secureEngine.stop();
          return;
        }

        engineRef.current = secureEngine;
        setEngine(secureEngine);
        setActiveNetworkName(localAdapter.name);
        setInitError(null);
        setInFlightCount(countInFlight(secureEngine));
      } catch (error) {
        if (active) {
          setInitError(error instanceof Error ? error.message : "Failed to initialize secure engine.");
          setActiveNetworkName("Unavailable");
        }
      }
    };

    void boot();

    return () => {
      active = false;
      const currentEngine = engineRef.current;
      if (currentEngine) {
        void currentEngine.stop();
      }
      engineRef.current = null;
    };
  }, [identity.publicFingerprint, localPeerId]);

  useEffect(() => {
    const id = setInterval(syncInFlightCount, 600);
    return () => clearInterval(id);
  }, [syncInFlightCount]);

  const setNetworkRoute = useCallback((route: RouteMode) => {
    networkAdapterRef.current?.setRoute(route);
  }, []);

  const sendMessage = useCallback(
    async ({ chatId, toPeerId, text, route, disappearPolicy }: SendMessageInput): Promise<ChatMessage> => {
      const activeEngine = engineRef.current;
      if (!activeEngine) {
        throw new Error(initError ?? "Engine is not ready.");
      }
      const sent = await activeEngine.sendMessage(chatId, toPeerId, text, route, disappearPolicy);
      setInFlightCount(countInFlight(activeEngine));
      return sent;
    },
    [initError],
  );

  const subscribeIncoming = useCallback((handler: (payload: IncomingPacketPayload) => void) => {
    if (!engine) {
      return () => {};
    }
    return engine.subscribeIncoming(handler);
  }, [engine]);

  const subscribePeerKeys = useCallback((handler: (event: PeerKeyEventPayload) => void) => {
    if (!engine) {
      return () => {};
    }
    return engine.subscribePeerKeyEvents(handler);
  }, [engine]);

  return {
    engine,
    identity,
    localPeerId,
    recoveryWords,
    phraseValid,
    cryptoCapability,
    initError,
    activeNetworkName,
    inFlightCount,
    securityBootstrap: SECURITY_BOOTSTRAP,
    signalingMode: SIGNALING_MODE,
    sendMessage,
    setNetworkRoute,
    subscribeIncoming,
    subscribePeerKeys,
  };
}
