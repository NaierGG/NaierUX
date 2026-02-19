import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AuthenticatedWebSocketSignalingAdapter,
  InMemoryP2PAdapter,
  InMemorySignalingAdapter,
  MessengerEngine,
  WebRTCP2PAdapter,
  configureSecurityFromEnvironment,
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
  NetworkAdapter,
  RouteMode,
  SecurityConfig,
} from "../core";

export type SendMessageInput = {
  chatId: string;
  toPeerId: string;
  text: string;
  route: RouteMode;
  disappearPolicy?: DisappearPolicy;
};

export type UseEngineResult = {
  engine: MessengerEngine | null;
  identity: IdentityProfile;
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
};

const SECURITY_BOOTSTRAP = configureSecurityFromEnvironment();
const LOCAL_PEER_ID = "peer-naier-local";
const ACTIVE_CHAT_PEER_ID = "peer-astra";
const SIGNAL_NAMESPACE = "naier-demo-mesh";

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
const SIGNALING_MODE: "ws-auth" | "in-memory-auth" = SIGNAL_SERVER_URL ? "ws-auth" : "in-memory-auth";

function countInFlight(engine: MessengerEngine | null): number {
  if (!engine) {
    return 0;
  }
  return engine
    .getQueueSnapshot()
    .filter((envelope) => envelope.state === "queued_local" || envelope.state === "sending").length;
}

export function useEngine(): UseEngineResult {
  const [engine, setEngine] = useState<MessengerEngine | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeNetworkName, setActiveNetworkName] = useState("Unavailable");
  const [inFlightCount, setInFlightCount] = useState(0);

  const networkAdapterRef = useRef<NetworkAdapter | null>(null);
  const remotePeerAdapterRef = useRef<NetworkAdapter | null>(null);
  const engineRef = useRef<MessengerEngine | null>(null);

  const recoveryWords = useMemo(() => generateRecoveryPhrase(12), []);
  const identity = useMemo(() => createIdentityProfile("Naier User", recoveryWords), [recoveryWords]);
  const phraseValid = useMemo(() => validateRecoveryPhrase(recoveryWords), [recoveryWords]);
  const cryptoCapability = useMemo(() => getCryptoCapability(), []);

  const syncInFlightCount = useCallback(() => {
    setInFlightCount(countInFlight(engineRef.current));
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribeRemotePeer = () => {};

    const boot = async () => {
      try {
        let localAdapter: NetworkAdapter;
        let remoteAdapter: NetworkAdapter;

        if (isWebRTCSupported()) {
          if (SIGNAL_SERVER_URL) {
            const localSignaling = new AuthenticatedWebSocketSignalingAdapter({
              url: SIGNAL_SERVER_URL,
              authToken: SIGNAL_AUTH_TOKEN,
              namespace: SIGNAL_NAMESPACE,
              onionMode: "tor",
            });
            const remoteSignaling = new AuthenticatedWebSocketSignalingAdapter({
              url: SIGNAL_SERVER_URL,
              authToken: SIGNAL_AUTH_TOKEN,
              namespace: SIGNAL_NAMESPACE,
              onionMode: "tor",
            });
            localAdapter = new WebRTCP2PAdapter(localSignaling, {
              reconnectMaxAttempts: 6,
              reconnectBaseDelayMs: 400,
              candidatePolicyByRoute: {
                "Direct P2P": "all",
                "2-hop Relay": "relay",
                Tor: "relay",
              },
              renegotiateOnRouteSwitch: true,
            });
            remoteAdapter = new WebRTCP2PAdapter(remoteSignaling, {
              reconnectMaxAttempts: 6,
              reconnectBaseDelayMs: 400,
              candidatePolicyByRoute: {
                "Direct P2P": "all",
                "2-hop Relay": "relay",
                Tor: "relay",
              },
              renegotiateOnRouteSwitch: true,
            });
          } else {
            const localSignaling = new InMemorySignalingAdapter({
              namespace: SIGNAL_NAMESPACE,
              authToken: SIGNAL_AUTH_TOKEN,
              onionMode: "relay2",
            });
            const remoteSignaling = new InMemorySignalingAdapter({
              namespace: SIGNAL_NAMESPACE,
              authToken: SIGNAL_AUTH_TOKEN,
              onionMode: "relay2",
            });
            localAdapter = new WebRTCP2PAdapter(localSignaling, {
              reconnectMaxAttempts: 4,
              reconnectBaseDelayMs: 300,
              candidatePolicyByRoute: {
                "Direct P2P": "all",
                "2-hop Relay": "all",
                Tor: "relay",
              },
              renegotiateOnRouteSwitch: true,
            });
            remoteAdapter = new WebRTCP2PAdapter(remoteSignaling, {
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
        } else {
          localAdapter = new InMemoryP2PAdapter();
          remoteAdapter = new InMemoryP2PAdapter();
        }

        const secureEngine = new MessengerEngine(
          establishSession(identity.publicFingerprint),
          localAdapter,
          LOCAL_PEER_ID,
        );

        networkAdapterRef.current = localAdapter;
        remotePeerAdapterRef.current = remoteAdapter;

        await remoteAdapter.start(ACTIVE_CHAT_PEER_ID);
        unsubscribeRemotePeer = remoteAdapter.subscribePackets(() => {
          // Companion peer for local signaling and packet loop.
        });

        await secureEngine.start();
        if (!active) {
          await secureEngine.stop();
          await remoteAdapter.stop();
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
      unsubscribeRemotePeer();
      const currentEngine = engineRef.current;
      const remotePeer = remotePeerAdapterRef.current;
      if (currentEngine) {
        void currentEngine.stop();
      }
      if (remotePeer) {
        void remotePeer.stop();
      }
      engineRef.current = null;
    };
  }, [identity.publicFingerprint]);

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

  return {
    engine,
    identity,
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
  };
}
