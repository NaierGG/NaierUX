import {
  advanceRatchet,
  decryptFromTransport,
  deriveAgreementSecretHex,
  encryptForTransport,
  toKeyAgreementDescriptor,
} from "./crypto";
import type { LocalKeyAgreement, SessionState } from "./crypto";
import { LocalMessageQueue } from "./localQueue";
import type { SendResult, NetworkAdapter } from "./network";
import type { ChatMessage, DisappearPolicy, EncryptedPacket, KeyAgreementDescriptor, QueueEnvelope, RouteMode } from "./types";

type HandshakePhase = "hello" | "key_exchange" | "ack" | "secure";

export interface PeerKeyEvent {
  peerId: string;
  keyId: string;
  publicKeyHex: string;
  status: "first_seen" | "changed";
}

interface PeerHandshakeState {
  phase: HandshakePhase;
  localHelloSent: boolean;
  peerHelloReceived: boolean;
  localKeyExchangeSent: boolean;
  peerKeyExchangeReceived: boolean;
  localAckSent: boolean;
  peerAckReceived: boolean;
}

interface PeerSessionState {
  peerId: string;
  session: SessionState;
  agreementSecretHex?: string;
  peerAgreement?: KeyAgreementDescriptor;
  handshake: PeerHandshakeState;
}

interface HandshakeWaiter {
  resolve: () => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const HANDSHAKE_TIMEOUT_MS = 8000;

function normalizePeerId(peerId: string): string {
  return peerId.trim().toLowerCase();
}

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function pairSeed(localPeerId: string, remotePeerId: string): string {
  const pair = [normalizePeerId(localPeerId), normalizePeerId(remotePeerId)].sort().join("|");
  return `${fnv1aHex(`sess:${pair}`)}${fnv1aHex(`finger:${pair}`)}`;
}

function createHandshakeState(): PeerHandshakeState {
  return {
    phase: "hello",
    localHelloSent: false,
    peerHelloReceived: false,
    localKeyExchangeSent: false,
    peerKeyExchangeReceived: false,
    localAckSent: false,
    peerAckReceived: false,
  };
}

export class MessengerEngine {
  private queue = new LocalMessageQueue();
  private sessionTemplate: SessionState;
  private peerSessions = new Map<string, PeerSessionState>();
  private network: NetworkAdapter;
  private localPeerId: string;
  private localAgreement: LocalKeyAgreement | null;
  private localAgreementDescriptor: KeyAgreementDescriptor | null;
  private handshakeWaiters = new Map<string, Set<HandshakeWaiter>>();
  private handshakeInFlight = new Map<string, Promise<void>>();
  private peerKeyListeners = new Set<(event: PeerKeyEvent) => void>();
  private started = false;

  constructor(
    sessionTemplate: SessionState,
    networkAdapter: NetworkAdapter,
    localPeerId: string,
    localAgreement: LocalKeyAgreement | null = null,
  ) {
    this.sessionTemplate = sessionTemplate;
    this.network = networkAdapter;
    this.localPeerId = localPeerId;
    this.localAgreement = localAgreement;
    this.localAgreementDescriptor = localAgreement ? toKeyAgreementDescriptor(localAgreement) : null;
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    await this.network.start(this.localPeerId);
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }
    await this.network.stop();
    this.started = false;
    this.peerSessions.clear();
    this.rejectAllHandshakeWaiters("Messenger engine stopped.");
    this.handshakeInFlight.clear();
  }

  getQueueSnapshot() {
    return this.queue.list();
  }

  subscribeIncoming(
    handler: (payload: { fromPeerId: string; plaintext: string; packetId: string }) => void,
  ): () => void {
    return this.network.subscribePackets(async (packet, fromPeerId) => {
      try {
        const normalizedPeerId = normalizePeerId(fromPeerId);
        const peerState = this.resolvePeerSession(normalizedPeerId);
        await this.capturePeerAgreement(peerState, packet.keyAgreement);
        const decrypted = await this.decryptIncoming(packet, peerState);

        if (packet.controlType) {
          await this.onHandshakeControl(peerState, packet.controlType, packet.route);
          return;
        }

        if (peerState.handshake.phase !== "secure") {
          await this.runHandshakeStep(peerState, packet.route);
          return;
        }

        handler({
          fromPeerId: normalizedPeerId,
          plaintext: decrypted,
          packetId: packet.id,
        });
      } catch {
        // Ignore invalid packet decode attempts.
      }
    });
  }

  subscribePeerKeyEvents(handler: (event: PeerKeyEvent) => void): () => void {
    this.peerKeyListeners.add(handler);
    return () => {
      this.peerKeyListeners.delete(handler);
    };
  }

  async sendMessage(
    chatId: string,
    toPeerId: string,
    plaintext: string,
    route: RouteMode,
    expiresIn?: DisappearPolicy,
  ): Promise<ChatMessage> {
    await this.start();

    const normalizedPeerId = normalizePeerId(toPeerId);
    const peerState = await this.ensurePeerSecure(normalizedPeerId, route);
    if (!peerState.agreementSecretHex) {
      throw new Error("Secure handshake not completed. Try again after key exchange.");
    }

    const activeSession = peerState.session;
    const encryptedBase = await encryptForTransport(
      plaintext,
      activeSession,
      route,
      peerState.agreementSecretHex,
    );
    const encrypted: EncryptedPacket = {
      ...encryptedBase,
      keyAgreement: this.localAgreementDescriptor ?? undefined,
    };

    const envelope: QueueEnvelope = {
      id: `env-${encrypted.id}`,
      chatId,
      plaintext,
      encrypted,
      retries: 0,
      state: "queued_local",
    };

    this.queue.enqueue(envelope);
    this.queue.updateState(envelope.id, "sending");

    const result = await this.sendPacketWithFallback(encrypted, normalizedPeerId, route);
    if (!result.delivered) {
      this.queue.incrementRetry(envelope.id);
    }
    this.queue.updateState(envelope.id, result.delivered ? "sent" : "failed");
    if (result.delivered) {
      peerState.session = advanceRatchet(activeSession);
    }

    return {
      id: `msg-${Date.now()}`,
      chatId,
      text: plaintext,
      fromMe: true,
      sentAtLabel: nowLabel(),
      delivery: result.delivered ? "sent" : "failed",
      expiresIn,
      routeUsed: result.routeUsed,
      cipherSuite: `${activeSession.cipherSuite}+ECDH-P256`,
    };
  }

  private async ensurePeerSecure(peerId: string, route: RouteMode): Promise<PeerSessionState> {
    if (!this.localAgreementDescriptor || !this.localAgreement?.privateKey) {
      throw new Error("Local ECDH key agreement is unavailable in this runtime.");
    }

    const peerState = this.resolvePeerSession(peerId);
    if (peerState.handshake.phase === "secure") {
      return peerState;
    }

    const existing = this.handshakeInFlight.get(peerId);
    if (existing) {
      await existing;
      return this.resolvePeerSession(peerId);
    }

    const task = (async () => {
      await this.runHandshakeStep(peerState, route);
      if (peerState.handshake.phase === "secure") {
        return;
      }

      const interval = setInterval(() => {
        void this.runHandshakeStep(peerState, route);
      }, 1200);

      try {
        await this.waitForPeerSecure(peerState.peerId, HANDSHAKE_TIMEOUT_MS);
      } finally {
        clearInterval(interval);
      }
    })();

    this.handshakeInFlight.set(peerId, task);
    try {
      await task;
    } finally {
      if (this.handshakeInFlight.get(peerId) === task) {
        this.handshakeInFlight.delete(peerId);
      }
    }

    const finalState = this.resolvePeerSession(peerId);
    if (finalState.handshake.phase !== "secure") {
      throw new Error("Secure handshake did not complete.");
    }
    return finalState;
  }

  private async runHandshakeStep(peerState: PeerSessionState, route: RouteMode): Promise<void> {
    if (peerState.handshake.phase === "secure") {
      return;
    }

    if (!peerState.handshake.localHelloSent) {
      await this.sendHandshakeControl(peerState, "hello", route);
    }

    if (peerState.handshake.peerHelloReceived && !peerState.handshake.localKeyExchangeSent) {
      await this.sendHandshakeControl(peerState, "key_exchange", route);
    }

    if (peerState.agreementSecretHex && !peerState.handshake.localAckSent) {
      await this.sendHandshakeControl(peerState, "ack", route);
    }

    this.refreshHandshakePhase(peerState);
  }

  private async sendHandshakeControl(
    peerState: PeerSessionState,
    type: "hello" | "key_exchange" | "ack",
    route: RouteMode,
  ): Promise<void> {
    if (type === "key_exchange" && !this.localAgreementDescriptor) {
      throw new Error("Cannot send key exchange without local ECDH descriptor.");
    }

    const activeSession = peerState.session;
    const encryptedBase = await encryptForTransport(
      `__naier_handshake__:${type}`,
      activeSession,
      route,
      undefined,
    );
    const encrypted: EncryptedPacket = {
      ...encryptedBase,
      controlType: type,
      keyAgreement:
        type === "key_exchange" || type === "ack"
          ? this.localAgreementDescriptor ?? undefined
          : undefined,
    };

    const result = await this.sendPacketWithFallback(encrypted, peerState.peerId, route);
    if (!result.delivered) {
      return;
    }

    peerState.session = advanceRatchet(activeSession);
    if (type === "hello") {
      peerState.handshake.localHelloSent = true;
    } else if (type === "key_exchange") {
      peerState.handshake.localKeyExchangeSent = true;
    } else {
      peerState.handshake.localAckSent = true;
    }
    this.refreshHandshakePhase(peerState);
  }

  private async onHandshakeControl(
    peerState: PeerSessionState,
    controlType: "hello" | "key_exchange" | "ack",
    route: RouteMode,
  ): Promise<void> {
    if (controlType === "hello") {
      peerState.handshake.peerHelloReceived = true;
    } else if (controlType === "key_exchange") {
      peerState.handshake.peerHelloReceived = true;
      peerState.handshake.peerKeyExchangeReceived = true;
    } else {
      peerState.handshake.peerHelloReceived = true;
      peerState.handshake.peerKeyExchangeReceived = true;
      peerState.handshake.peerAckReceived = true;
    }

    this.refreshHandshakePhase(peerState);
    await this.runHandshakeStep(peerState, route);
  }

  private refreshHandshakePhase(peerState: PeerSessionState): void {
    const previous = peerState.handshake.phase;
    const handshake = peerState.handshake;

    if (peerState.agreementSecretHex && handshake.localAckSent && handshake.peerAckReceived) {
      handshake.phase = "secure";
    } else if (peerState.agreementSecretHex && (handshake.localAckSent || handshake.peerAckReceived)) {
      handshake.phase = "ack";
    } else if (handshake.localKeyExchangeSent || handshake.peerKeyExchangeReceived) {
      handshake.phase = "key_exchange";
    } else {
      handshake.phase = "hello";
    }

    if (previous !== "secure" && handshake.phase === "secure") {
      this.resolveHandshakeWaiters(peerState.peerId);
    }
  }

  private async sendPacketWithFallback(
    packet: EncryptedPacket,
    toPeerId: string,
    route: RouteMode,
  ): Promise<SendResult> {
    this.network.setRoute(route);
    let result = await this.network.sendPacket(packet, toPeerId);

    if (!result.delivered) {
      const fallback = this.network.nextFallbackRoute(route);
      this.network.setRoute(fallback);
      result = await this.network.sendPacket(
        {
          ...packet,
          route: fallback,
        },
        toPeerId,
      );
    }

    return result;
  }

  private async decryptIncoming(packet: EncryptedPacket, peerState: PeerSessionState): Promise<string> {
    const baseSession = {
      ...peerState.session,
      ratchetEpoch: packet.ratchetEpoch,
    };
    if (peerState.agreementSecretHex) {
      try {
        return await decryptFromTransport(packet, baseSession, peerState.agreementSecretHex);
      } catch {
        // Fall back to PSK-only for transitional packets during key upgrade.
      }
    }
    return decryptFromTransport(packet, baseSession);
  }

  private async capturePeerAgreement(
    peerState: PeerSessionState,
    descriptor?: KeyAgreementDescriptor,
  ): Promise<void> {
    if (!descriptor) {
      return;
    }
    try {
      const normalizedDescriptor: KeyAgreementDescriptor = {
        curve: descriptor.curve,
        keyId: descriptor.keyId.trim(),
        publicKeyHex: descriptor.publicKeyHex.trim().toLowerCase(),
      };
      if (!normalizedDescriptor.keyId || !normalizedDescriptor.publicKeyHex) {
        return;
      }

      const hadExisting = Boolean(peerState.peerAgreement);
      const unchanged =
        hadExisting &&
        peerState.peerAgreement!.keyId === normalizedDescriptor.keyId &&
        peerState.peerAgreement!.publicKeyHex === normalizedDescriptor.publicKeyHex;
      if (unchanged) {
        return;
      }

      peerState.peerAgreement = normalizedDescriptor;
      this.emitPeerKeyEvent({
        peerId: peerState.peerId,
        keyId: normalizedDescriptor.keyId,
        publicKeyHex: normalizedDescriptor.publicKeyHex,
        status: hadExisting ? "changed" : "first_seen",
      });

      if (!this.localAgreement) {
        return;
      }

      const derivedSecret = await deriveAgreementSecretHex(this.localAgreement, normalizedDescriptor);
      if (derivedSecret) {
        peerState.agreementSecretHex = derivedSecret;
      }
      this.refreshHandshakePhase(peerState);
    } catch {
      // Ignore malformed key agreement metadata and continue with PSK-only decrypt path.
    }
  }

  private emitPeerKeyEvent(event: PeerKeyEvent): void {
    this.peerKeyListeners.forEach((listener) => listener(event));
  }

  private waitForPeerSecure(peerId: string, timeoutMs: number): Promise<void> {
    const peerState = this.resolvePeerSession(peerId);
    if (peerState.handshake.phase === "secure") {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const waiters = this.handshakeWaiters.get(peerId) ?? new Set<HandshakeWaiter>();
      const waiter: HandshakeWaiter = {
        resolve: () => {
          clearTimeout(waiter.timer);
          waiters.delete(waiter);
          if (waiters.size === 0) {
            this.handshakeWaiters.delete(peerId);
          }
          resolve();
        },
        reject: (reason: Error) => {
          clearTimeout(waiter.timer);
          waiters.delete(waiter);
          if (waiters.size === 0) {
            this.handshakeWaiters.delete(peerId);
          }
          reject(reason);
        },
        timer: setTimeout(() => {
          waiter.reject(new Error(`Handshake timeout with ${peerId}.`));
        }, timeoutMs),
      };
      waiters.add(waiter);
      this.handshakeWaiters.set(peerId, waiters);
    });
  }

  private resolveHandshakeWaiters(peerId: string): void {
    const waiters = this.handshakeWaiters.get(peerId);
    if (!waiters || waiters.size === 0) {
      return;
    }
    [...waiters].forEach((waiter) => waiter.resolve());
  }

  private rejectAllHandshakeWaiters(message: string): void {
    for (const [peerId, waiters] of this.handshakeWaiters.entries()) {
      const error = new Error(`${message} (${peerId})`);
      [...waiters].forEach((waiter) => waiter.reject(error));
    }
    this.handshakeWaiters.clear();
  }

  private resolvePeerSession(peerId: string): PeerSessionState {
    const normalizedPeerId = normalizePeerId(peerId);
    const existing = this.peerSessions.get(normalizedPeerId);
    if (existing) {
      return existing;
    }

    const seed = pairSeed(this.localPeerId, normalizedPeerId);
    const derived: PeerSessionState = {
      peerId: normalizedPeerId,
      session: {
        ...this.sessionTemplate,
        sessionId: `sess-${seed}`,
        peerFingerprint: `${seed.slice(0, 4)}:${seed.slice(4, 8)}:${seed.slice(8, 12)}:${seed.slice(12, 16)}`,
        ratchetEpoch: 1,
        establishedAtIso: new Date().toISOString(),
      },
      handshake: createHandshakeState(),
    };
    this.peerSessions.set(normalizedPeerId, derived);
    return derived;
  }
}
