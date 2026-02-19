import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  AuthenticatedWebSocketSignalingAdapter,
  InMemoryP2PAdapter,
  InMemorySignalingAdapter,
  MessengerEngine,
  MockWebRTCCallAdapter,
  WebRTCP2PAdapter,
  configureSecurityFromEnvironment,
  createIdentityProfile,
  establishSession,
  generateRecoveryPhrase,
  getCryptoCapability,
  getRouteStatus,
  isWebRTCSupported,
  validateRecoveryPhrase,
} from "./src/core";
import type {
  ChatMessage,
  CallState,
  DisappearPolicy,
  NetworkAdapter,
  RouteMode,
} from "./src/core";
import { CHAT_MESSAGES, CHAT_PREVIEWS, DEFAULT_POLICY, DEFAULT_ROUTE } from "./src/state/mockData";

const SECURITY_BOOTSTRAP = configureSecurityFromEnvironment();

const LOCAL_PEER_ID = "peer-naier-local";
const ACTIVE_CHAT_PEER_ID = "peer-astra";
const SIGNAL_NAMESPACE = "naier-demo-mesh";

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
const SIGNAL_AUTH_TOKEN = runtimeEnv("NAIER_SIGNALING_TOKEN") ?? "dev-signaling-secret";
const SIGNALING_MODE = SIGNAL_SERVER_URL ? "ws-auth" : "in-memory-auth";

type AccentMode = "Neon Green" | "Neon Red" | "Highlight Purple" | "Cyber Blue";

type ScreenId =
  | "splash"
  | "recovery"
  | "home"
  | "newChat"
  | "chat"
  | "group"
  | "call"
  | "contacts"
  | "profile"
  | "settings"
  | "appearance"
  | "backup";

const COLORS = {
  bg0: "#000000",
  bg1: "#0A0A0A",
  card: "#111111",
  myBubble: "#1A1A1A",
  peerBubble: "#151515",
  accentMain: "#00FF9D",
  accentAlert: "#FF2E63",
  accentHighlight: "#7C3AED",
  accentCyber: "#00D4FF",
  textPrimary: "#F0F0F0",
  textSecondary: "#AAAAAA",
  success: "#39FF14",
  danger: "#FF2E63",
};

const ACCENT_BY_MODE: Record<AccentMode, string> = {
  "Neon Green": COLORS.accentMain,
  "Neon Red": COLORS.accentAlert,
  "Highlight Purple": COLORS.accentHighlight,
  "Cyber Blue": COLORS.accentCyber,
};

function routeColor(route: RouteMode): string {
  if (route === "Direct P2P") return COLORS.success;
  if (route === "2-hop Relay") return COLORS.accentCyber;
  return COLORS.accentAlert;
}

function nextRouteMode(route: RouteMode): RouteMode {
  if (route === "Direct P2P") return "2-hop Relay";
  if (route === "2-hop Relay") return "Tor";
  return "Direct P2P";
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Card({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <View
      style={[
        styles.card,
        accent
          ? {
              borderColor: accent,
              shadowColor: accent,
            }
          : null,
      ]}
    >
      {children}
    </View>
  );
}

function Pill({
  label,
  color,
  active,
  onPress,
}: {
  label: string;
  color: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        active ? { borderColor: color, shadowColor: color, backgroundColor: "#0E0E0E" } : null,
      ]}
    >
      <Text style={[styles.pillText, active ? { color } : null]}>{label}</Text>
    </Pressable>
  );
}

function AppHeader({
  title,
  subtitle,
  rightActionLabel,
  onRightAction,
}: {
  title: string;
  subtitle?: string;
  rightActionLabel?: string;
  onRightAction?: () => void;
}) {
  return (
    <View style={styles.headerRow}>
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightActionLabel ? (
        <Pressable onPress={onRightAction} style={styles.smallAction}>
          <Text style={styles.smallActionText}>{rightActionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("splash");
  const [route, setRoute] = useState<RouteMode>(DEFAULT_ROUTE);
  const [accentMode, setAccentMode] = useState<AccentMode>("Neon Green");
  const [draft, setDraft] = useState("");
  const [disappearPolicy, setDisappearPolicy] = useState<DisappearPolicy>(DEFAULT_POLICY);
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_MESSAGES);
  const [sending, setSending] = useState(false);
  const [callState, setCallState] = useState<CallState>({
    phase: "idle",
    mode: "voice",
    peerId: null,
    route: DEFAULT_ROUTE,
    encrypted: true,
    muted: false,
    cameraEnabled: true,
    speakerEnabled: true,
    latencyMs: 0,
    bars: 0,
    jitterMs: 0,
    packetLossPct: 0,
    durationSec: 0,
  });

  const recoveryWords = useMemo(() => generateRecoveryPhrase(12), []);
  const identity = useMemo(
    () => createIdentityProfile("Naier User", recoveryWords),
    [recoveryWords],
  );
  const cryptoCapability = useMemo(() => getCryptoCapability(), []);
  const phraseValid = useMemo(() => validateRecoveryPhrase(recoveryWords), [recoveryWords]);
  const routeStatus = useMemo(() => getRouteStatus(route), [route]);
  const accent = useMemo(() => ACCENT_BY_MODE[accentMode], [accentMode]);

  const networkAdapterRef = useRef<NetworkAdapter | null>(null);
  const remotePeerAdapterRef = useRef<NetworkAdapter | null>(null);
  const engineInitErrorRef = useRef<string | null>(null);

  if (!networkAdapterRef.current && !engineInitErrorRef.current) {
    try {
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
          networkAdapterRef.current = new WebRTCP2PAdapter(localSignaling, {
            reconnectMaxAttempts: 6,
            reconnectBaseDelayMs: 400,
            candidatePolicyByRoute: {
              "Direct P2P": "all",
              "2-hop Relay": "relay",
              Tor: "relay",
            },
            renegotiateOnRouteSwitch: true,
          });
          remotePeerAdapterRef.current = new WebRTCP2PAdapter(remoteSignaling, {
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
          networkAdapterRef.current = new WebRTCP2PAdapter(localSignaling, {
            reconnectMaxAttempts: 4,
            reconnectBaseDelayMs: 300,
            candidatePolicyByRoute: {
              "Direct P2P": "all",
              "2-hop Relay": "all",
              Tor: "relay",
            },
            renegotiateOnRouteSwitch: true,
          });
          remotePeerAdapterRef.current = new WebRTCP2PAdapter(remoteSignaling, {
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
        networkAdapterRef.current = new InMemoryP2PAdapter();
        remotePeerAdapterRef.current = new InMemoryP2PAdapter();
      }
    } catch (error) {
      engineInitErrorRef.current =
        error instanceof Error ? error.message : "Failed to initialize network adapter.";
    }
  }

  const engineRef = useRef<MessengerEngine | null>(null);
  if (!engineRef.current && networkAdapterRef.current && !engineInitErrorRef.current) {
    try {
      engineRef.current = new MessengerEngine(
        establishSession(identity.publicFingerprint),
        networkAdapterRef.current,
        LOCAL_PEER_ID,
      );
    } catch (error) {
      engineInitErrorRef.current =
        error instanceof Error ? error.message : "Failed to initialize secure session.";
    }
  }
  const initError = engineInitErrorRef.current;
  const activeNetworkName = networkAdapterRef.current?.name ?? "Unavailable";

  const callAdapterRef = useRef<MockWebRTCCallAdapter | null>(null);
  if (!callAdapterRef.current) {
    callAdapterRef.current = new MockWebRTCCallAdapter();
  }

  useEffect(() => {
    const engine = engineRef.current;
    const remotePeer = remotePeerAdapterRef.current;
    const callAdapter = callAdapterRef.current;
    let unsubscribe = () => {};
    let unsubscribeRemotePeer = () => {};

    const boot = async () => {
      if (remotePeer) {
        await remotePeer.start(ACTIVE_CHAT_PEER_ID);
        unsubscribeRemotePeer = remotePeer.subscribePackets(() => {
          // Demo companion peer for WebRTC handshake and packet delivery.
        });
      }
      if (engine) {
        await engine.start();
      }
    };
    void boot();

    if (callAdapter) {
      unsubscribe = callAdapter.subscribe(setCallState);
    }

    return () => {
      unsubscribe();
      unsubscribeRemotePeer();
      if (callAdapter) {
        callAdapter.dispose();
      }
      if (engine) {
        void engine.stop();
      }
      if (remotePeer) {
        void remotePeer.stop();
      }
    };
  }, []);

  useEffect(() => {
    networkAdapterRef.current?.setRoute(route);
    callAdapterRef.current?.switchRoute(route);
  }, [route]);

  const queueSnapshot = engineRef.current ? engineRef.current.getQueueSnapshot() : [];
  const inFlightCount = queueSnapshot.filter(
    (envelope) => envelope.state === "queued_local" || envelope.state === "sending",
  ).length;

  async function sendCurrentDraft() {
    const trimmed = draft.trim();
    if (!trimmed || sending || !engineRef.current || initError) {
      return;
    }

    const optimisticId = `msg-local-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      chatId: "chat-astra",
      text: trimmed,
      fromMe: true,
      sentAtLabel: "now",
      delivery: "sending",
      expiresIn: disappearPolicy,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);

    try {
      const sent = await engineRef.current!.sendMessage(
        "chat-astra",
        ACTIVE_CHAT_PEER_ID,
        trimmed,
        route,
        disappearPolicy,
      );
      setMessages((prev) => prev.map((msg) => (msg.id === optimisticId ? sent : msg)));
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticId
            ? {
                ...msg,
                delivery: "failed",
                routeUsed: route,
                cipherSuite: cryptoCapability.scheme,
              }
            : msg,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  const baseStatus = (
    <View style={styles.statusBar}>
      <Text style={styles.statusText}>9:41</Text>
      <View style={styles.statusRight}>
        <Text style={styles.statusText}>||||</Text>
        <Text style={styles.statusText}>87%</Text>
      </View>
    </View>
  );

  function nav(label: string, id: ScreenId) {
    return (
      <Pressable key={id} onPress={() => setScreen(id)} style={styles.navItem}>
        <Text style={[styles.navText, screen === id ? { color: accent } : null]}>{label}</Text>
      </Pressable>
    );
  }

  function formatDuration(durationSec: number): string {
    const minutes = Math.floor(durationSec / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (durationSec % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  async function startSecureCall(mode: "voice" | "video") {
    if (!callAdapterRef.current) {
      return;
    }
    await callAdapterRef.current.startCall("peer-astra", mode, route);
  }

  async function endSecureCall() {
    if (!callAdapterRef.current) {
      return;
    }
    await callAdapterRef.current.endCall("local_end");
  }

  function routeStrip() {
    return (
      <Card accent={routeColor(route)}>
        <Text style={[styles.routeLabel, { color: routeColor(route) }]}>{route}</Text>
        <Text style={styles.routeMeta}>
          {routeStatus.label} | {routeStatus.latencyMs}ms | bars {routeStatus.bars}/5
        </Text>
        <View style={styles.routeButtons}>
          <Pill
            label="Direct P2P"
            color={COLORS.success}
            active={route === "Direct P2P"}
            onPress={() => setRoute("Direct P2P")}
          />
          <Pill
            label="2-hop Relay"
            color={COLORS.accentCyber}
            active={route === "2-hop Relay"}
            onPress={() => setRoute("2-hop Relay")}
          />
          <Pill
            label="Tor"
            color={COLORS.accentAlert}
            active={route === "Tor"}
            onPress={() => setRoute("Tor")}
          />
        </View>
      </Card>
    );
  }

  function renderSplash() {
    return (
      <>
        <AppHeader title="Naier" subtitle="Talk without traces. Connect without masters." />
        <Card accent={accent}>
          <Text style={styles.largeLabel}>Onboarding 1/3</Text>
          <Text style={styles.body}>
            Identity is local-first. No phone number, no central account authority.
          </Text>
        </Card>
        <Card>
          <Text style={styles.largeLabel}>Onboarding 2/3</Text>
          <Text style={styles.body}>
            Messages are E2EE with forward secrecy and route fallback transparency.
          </Text>
        </Card>
        <Card>
          <Text style={styles.largeLabel}>Onboarding 3/3</Text>
          <Text style={styles.body}>
            Control route policy, trust fingerprints, and disappearing defaults before first chat.
          </Text>
        </Card>
        <Pressable
          onPress={() => setScreen("recovery")}
          style={[styles.primaryButton, { borderColor: accent }]}
        >
          <Text style={[styles.primaryButtonText, { color: accent }]}>Create Identity</Text>
        </Pressable>
      </>
    );
  }

  function renderRecovery() {
    return (
      <>
        <AppHeader
          title="Recovery Phrase"
          subtitle={`${recoveryWords.length}-word seed | ${phraseValid ? "valid" : "invalid"}`}
        />
        <Card>
          <Text style={styles.warning}>Never screenshot or cloud-sync your phrase.</Text>
          <View style={styles.chipGrid}>
            {recoveryWords.map((word, idx) => (
              <View key={`${word}-${idx}`} style={styles.wordChip}>
                <Text style={styles.wordChipText}>
                  {idx + 1}. {word}
                </Text>
              </View>
            ))}
          </View>
        </Card>
        <Card accent={accent}>
          <Text style={styles.body}>Verification challenge: confirm words #3, #7, #11.</Text>
        </Card>
        <Pressable onPress={() => setScreen("home")} style={[styles.primaryButton, { borderColor: accent }]}>
          <Text style={[styles.primaryButtonText, { color: accent }]}>Continue to Home</Text>
        </Pressable>
      </>
    );
  }

  function renderHome() {
    return (
      <>
        <AppHeader
          title="Chats"
          subtitle="Local-first inbox"
          rightActionLabel="New"
          onRightAction={() => setScreen("newChat")}
        />
        {routeStrip()}
        <SectionTitle title="Recent" />
        {CHAT_PREVIEWS.map((row) => (
          <Pressable key={row.id} onPress={() => setScreen("chat")} style={styles.chatRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{row.name[0]}</Text>
            </View>
            <View style={styles.chatMeta}>
              <Text style={styles.chatName}>{row.name}</Text>
              <Text style={styles.chatPreview}>{row.lastMessage}</Text>
            </View>
            <View style={styles.chatRight}>
              <Text style={styles.chatTime}>{row.timeLabel}</Text>
              {row.unread > 0 ? (
                <View style={[styles.badge, { backgroundColor: accent }]}>
                  <Text style={styles.badgeText}>{row.unread}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </>
    );
  }

  function renderNewChat() {
    return (
      <>
        <AppHeader title="New Chat" subtitle="Search by name or fingerprint" />
        <TextInput
          placeholder="Search contact / fingerprint"
          placeholderTextColor={COLORS.textSecondary}
          style={styles.searchInput}
        />
        <Card>
          <Text style={styles.largeLabel}>Add Contact</Text>
          <View style={styles.rowWrap}>
            <Pill label="Scan QR" color={accent} />
            <Pill label="NFC Tap" color={accent} />
            <Pill label="Invite Link" color={accent} />
          </View>
        </Card>
        <Card>
          <Text style={styles.body}>Trust states: Verified, Unverified, Key Changed.</Text>
        </Card>
      </>
    );
  }

  function renderChat() {
    return (
      <>
        <AppHeader
          title="Astra"
          subtitle={`${route} | ${routeStatus.latencyMs}ms`}
          rightActionLabel="Call"
          onRightAction={() => {
            setScreen("call");
            void startSecureCall("voice");
          }}
        />
        <Card accent={routeColor(route)}>
          <Text style={[styles.routeLabel, { color: routeColor(route) }]}>{route}</Text>
          <Text style={styles.routeMeta}>
            Disappearing: {disappearPolicy} | Queue in-flight: {inFlightCount}
          </Text>
          <Text style={styles.routeMeta}>Adapter: {activeNetworkName}</Text>
        </Card>
        {initError ? (
          <Card accent={COLORS.accentAlert}>
            <Text style={styles.warning}>Secure transport is blocked.</Text>
            <Text style={styles.small}>{initError}</Text>
          </Card>
        ) : null}
        <View style={styles.messageList}>
          {messages
            .filter((msg) => msg.chatId === "chat-astra")
            .map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.fromMe
                    ? {
                        alignSelf: "flex-end",
                        backgroundColor: COLORS.myBubble,
                        borderColor: COLORS.accentCyber,
                      }
                    : {
                        alignSelf: "flex-start",
                        backgroundColor: COLORS.peerBubble,
                        borderColor: "#202020",
                      },
                ]}
              >
                <Text style={styles.body}>{msg.text}</Text>
                <Text style={styles.chatTime}>
                  {msg.sentAtLabel} | {msg.delivery}
                  {msg.routeUsed ? ` | ${msg.routeUsed}` : ""}
                </Text>
                {msg.cipherSuite ? <Text style={styles.chatTime}>{msg.cipherSuite}</Text> : null}
              </View>
            ))}
        </View>
        <Card>
          <Text style={styles.small}>Screenshot block: ON</Text>
          <Text style={styles.small}>Anti-delete protection: ON</Text>
          <View style={styles.rowWrap}>
            {(["5 min", "1 h", "24 h", "30 d"] as DisappearPolicy[]).map((policy) => (
              <Pill
                key={policy}
                label={policy}
                color={accent}
                active={disappearPolicy === policy}
                onPress={() => setDisappearPolicy(policy)}
              />
            ))}
          </View>
        </Card>
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Encrypted message"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.composerInput}
          />
          <Pressable
            onPress={sendCurrentDraft}
            disabled={Boolean(initError)}
            style={[
              styles.sendButton,
              { borderColor: accent, shadowColor: accent },
              initError ? { opacity: 0.45 } : null,
            ]}
          >
            <Text style={[styles.sendText, { color: accent }]}>
              {initError ? "Blocked" : sending ? "..." : "Send"}
            </Text>
          </Pressable>
        </View>
      </>
    );
  }

  function renderGroup() {
    return (
      <>
        <AppHeader title="Ops Mesh" subtitle="26 members | Onion enforced" />
        <Card>
          <Text style={styles.body}>Roles: Owner, Moderator, Member</Text>
          <Text style={styles.small}>Group expiry default: 24h</Text>
          <Text style={styles.small}>Moderation: Report + Route policy lock</Text>
        </Card>
        <Pressable onPress={() => setScreen("chat")} style={styles.linkButton}>
          <Text style={[styles.linkButtonText, { color: accent }]}>Open Group Thread Prototype</Text>
        </Pressable>
      </>
    );
  }

  function renderCall() {
    return (
      <>
        <AppHeader title="Voice / Video Call" subtitle={`Astra | ${callState.route}`} />
        <Card accent={routeColor(route)}>
          <Text style={styles.largeLabel}>
            {callState.phase === "connected"
              ? `${callState.mode.toUpperCase()} call active`
              : "Route Quality"}
          </Text>
          <Text style={styles.body}>
            {callState.phase} | {callState.latencyMs}ms | bars {callState.bars}/5
          </Text>
          <Text style={styles.small}>
            jitter {callState.jitterMs}ms | loss {callState.packetLossPct.toFixed(1)}% | duration{" "}
            {formatDuration(callState.durationSec)}
          </Text>
          <Text style={styles.small}>
            {callState.encrypted ? "WebRTC E2EE session active" : "Encryption inactive"}
          </Text>
        </Card>
        <View style={styles.callStage}>
          <Text style={styles.body}>
            {callState.phase === "connected"
              ? `${callState.mode.toUpperCase()} stream`
              : "Call preview area"}
          </Text>
        </View>
        <View style={styles.rowWrap}>
          <Pressable onPress={() => startSecureCall("voice")} style={styles.linkButton}>
            <Text style={[styles.linkButtonText, { color: accent }]}>Start Voice</Text>
          </Pressable>
          <Pressable onPress={() => startSecureCall("video")} style={styles.linkButton}>
            <Text style={[styles.linkButtonText, { color: accent }]}>Start Video</Text>
          </Pressable>
        </View>
        <View style={styles.callControls}>
          <Pressable
            onPress={() => callAdapterRef.current?.toggleMute()}
            style={styles.controlButton}
          >
            <Text style={styles.small}>{callState.muted ? "Unmute" : "Mute"}</Text>
          </Pressable>
          <Pressable
            onPress={() => callAdapterRef.current?.toggleCamera()}
            style={styles.controlButton}
          >
            <Text style={styles.small}>{callState.cameraEnabled ? "Camera On" : "Camera Off"}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const next = nextRouteMode(callState.route);
              setRoute(next);
              callAdapterRef.current?.switchRoute(next);
            }}
            style={styles.controlButton}
          >
            <Text style={styles.small}>Route</Text>
          </Pressable>
          <Pressable
            onPress={() => callAdapterRef.current?.toggleSpeaker()}
            style={styles.controlButton}
          >
            <Text style={styles.small}>{callState.speakerEnabled ? "Speaker On" : "Speaker Off"}</Text>
          </Pressable>
          <Pressable onPress={endSecureCall} style={[styles.controlButton, styles.hangup]}>
            <Text style={styles.small}>End</Text>
          </Pressable>
        </View>
      </>
    );
  }

  function renderContacts() {
    return (
      <>
        <AppHeader title="Contacts" subtitle="Verified first" />
        <Card>
          <Text style={styles.largeLabel}>QR Scanner</Text>
          <View style={styles.qrFrame}>
            <Text style={styles.body}>280 x 280 scan frame</Text>
          </View>
        </Card>
        <Card>
          <Text style={styles.body}>Astra | Verified fingerprint</Text>
          <Text style={styles.body}>Node-11 | Unverified</Text>
        </Card>
      </>
    );
  }

  function renderProfile() {
    return (
      <>
        <AppHeader title="Profile & Keys" subtitle="Self-sovereign identity" />
        <Card>
          <Text style={styles.body}>Display name: {identity.displayName}</Text>
          <Text style={styles.body}>Fingerprint: {identity.publicFingerprint}</Text>
          <Text style={styles.small}>Created: {identity.createdAtIso.slice(0, 10)}</Text>
          <Text style={styles.small}>Cipher suite: {cryptoCapability.scheme}</Text>
          <Text
            style={[
              styles.small,
              !cryptoCapability.strongCryptoAvailable ? { color: COLORS.danger } : null,
            ]}
          >
            Crypto runtime:{" "}
            {cryptoCapability.strongCryptoAvailable ? "Strong crypto ready" : "Strong crypto blocked"}
          </Text>
          {cryptoCapability.blockingReason ? (
            <Text style={styles.warning}>{cryptoCapability.blockingReason}</Text>
          ) : null}
          {SECURITY_BOOTSTRAP.note ? <Text style={styles.warning}>{SECURITY_BOOTSTRAP.note}</Text> : null}
        </Card>
        <Card accent={accent}>
          <Text style={styles.body}>Copy key, show QR, rotate prekeys</Text>
        </Card>
      </>
    );
  }

  function renderSettings() {
    return (
      <>
        <AppHeader title="Settings" subtitle="Security and privacy first" />
        <Card>
          <Text style={styles.body}>Biometric lock: ON</Text>
          <Text style={styles.body}>Default disappearing: ON</Text>
          <Text style={styles.body}>Screenshot block: ON</Text>
          <Text style={styles.body}>Tor default route: OFF</Text>
          <Text style={styles.small}>Network adapter: {activeNetworkName}</Text>
          <Text style={styles.small}>Signaling: {SIGNALING_MODE}</Text>
          <Text style={styles.small}>
            Crypto policy: {SECURITY_BOOTSTRAP.cryptoPolicy} ({SECURITY_BOOTSTRAP.source})
          </Text>
          <Text style={styles.small}>Dev runtime: {SECURITY_BOOTSTRAP.devRuntime ? "yes" : "no"}</Text>
        </Card>
        <View style={styles.rowWrap}>
          <Pressable onPress={() => setScreen("appearance")} style={styles.linkButton}>
            <Text style={[styles.linkButtonText, { color: accent }]}>Appearance</Text>
          </Pressable>
          <Pressable onPress={() => setScreen("backup")} style={styles.linkButton}>
            <Text style={[styles.linkButtonText, { color: accent }]}>Backup & Export</Text>
          </Pressable>
        </View>
      </>
    );
  }

  function renderAppearance() {
    const modes: AccentMode[] = ["Neon Green", "Neon Red", "Highlight Purple", "Cyber Blue"];
    return (
      <>
        <AppHeader title="Appearance" subtitle="Dark-only mode enforced" />
        <Card>
          <Text style={styles.largeLabel}>Accent Picker</Text>
          <View style={styles.rowWrap}>
            {modes.map((mode) => (
              <Pill
                key={mode}
                label={mode}
                color={ACCENT_BY_MODE[mode]}
                active={accentMode === mode}
                onPress={() => setAccentMode(mode)}
              />
            ))}
          </View>
        </Card>
        <Card accent={accent}>
          <Text style={styles.body}>Preview bubble + action glow updates live.</Text>
        </Card>
      </>
    );
  }

  function renderBackup() {
    return (
      <>
        <AppHeader title="Backup & Export" subtitle="Air-gapped export recommended" />
        <Card>
          <Text style={styles.body}>Local encrypted backup: Ready</Text>
          <Text style={styles.body}>Recovery phrase re-check: Pending</Text>
          <Text style={styles.warning}>Avoid cloud destinations that expose metadata.</Text>
        </Card>
        <Card accent={COLORS.accentAlert}>
          <Text style={styles.body}>Export includes encrypted history + contact fingerprints.</Text>
        </Card>
      </>
    );
  }

  function renderScreen() {
    if (screen === "splash") return renderSplash();
    if (screen === "recovery") return renderRecovery();
    if (screen === "home") return renderHome();
    if (screen === "newChat") return renderNewChat();
    if (screen === "chat") return renderChat();
    if (screen === "group") return renderGroup();
    if (screen === "call") return renderCall();
    if (screen === "contacts") return renderContacts();
    if (screen === "profile") return renderProfile();
    if (screen === "settings") return renderSettings();
    if (screen === "appearance") return renderAppearance();
    return renderBackup();
  }

  return (
    <SafeAreaView style={styles.safe}>
      {baseStatus}
      <View style={styles.appShell}>
        <ScrollView contentContainerStyle={styles.content}>{renderScreen()}</ScrollView>
      </View>
      <View style={styles.bottomNav}>
        {nav("Chats", "home")}
        {nav("Contacts", "contacts")}
        {nav("Calls", "call")}
        {nav("Groups", "group")}
        {nav("Settings", "settings")}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg0,
  },
  statusBar: {
    height: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#151515",
    backgroundColor: COLORS.bg0,
  },
  statusText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  statusRight: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  appShell: {
    flex: 1,
    backgroundColor: COLORS.bg1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  smallAction: {
    borderWidth: 1,
    borderColor: COLORS.accentCyber,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallActionText: {
    color: COLORS.accentCyber,
    fontSize: 12,
    fontWeight: "500",
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 12,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  largeLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  body: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  small: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  warning: {
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  primaryButton: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  wordChip: {
    width: "31%",
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: COLORS.peerBubble,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#222222",
  },
  wordChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  chatRow: {
    minHeight: 72,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.accentCyber,
    backgroundColor: "#0F0F0F",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  chatMeta: {
    flex: 1,
  },
  chatName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  chatPreview: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  chatRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  chatTime: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "600",
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
  },
  routeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  routeMeta: {
    color: COLORS.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  routeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#131313",
  },
  pillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  messageList: {
    gap: 8,
  },
  messageBubble: {
    maxWidth: "78%",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  composer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  composerInput: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#272727",
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
  },
  sendButton: {
    height: 52,
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  sendText: {
    fontSize: 13,
    fontWeight: "600",
  },
  linkButton: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#111111",
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  callStage: {
    minHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#202020",
    backgroundColor: "#090909",
    alignItems: "center",
    justifyContent: "center",
  },
  callControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  controlButton: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#303030",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#131313",
  },
  hangup: {
    borderColor: COLORS.danger,
    backgroundColor: "#1A0D12",
  },
  qrFrame: {
    marginTop: 8,
    width: "100%",
    minHeight: 220,
    borderWidth: 1,
    borderColor: COLORS.accentMain,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B0B",
  },
  bottomNav: {
    minHeight: 62,
    borderTopWidth: 1,
    borderTopColor: "#161616",
    backgroundColor: COLORS.bg0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  navItem: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  navText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    letterSpacing: -0.1,
  },
});
