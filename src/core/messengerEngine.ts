import { advanceRatchet, decryptFromTransport, encryptForTransport } from "./crypto";
import type { SessionState } from "./crypto";
import { LocalMessageQueue } from "./localQueue";
import type { NetworkAdapter } from "./network";
import type { ChatMessage, DisappearPolicy, QueueEnvelope, RouteMode } from "./types";

export class MessengerEngine {
  private queue = new LocalMessageQueue();
  private session: SessionState;
  private network: NetworkAdapter;
  private localPeerId: string;
  private started = false;

  constructor(session: SessionState, networkAdapter: NetworkAdapter, localPeerId: string) {
    this.session = session;
    this.network = networkAdapter;
    this.localPeerId = localPeerId;
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
  }

  getQueueSnapshot() {
    return this.queue.list();
  }

  subscribeIncoming(
    handler: (payload: { fromPeerId: string; plaintext: string; packetId: string }) => void,
  ): () => void {
    return this.network.subscribePackets(async (packet, fromPeerId) => {
      try {
        const decrypted = await decryptFromTransport(packet, {
          ...this.session,
          ratchetEpoch: packet.ratchetEpoch,
        });
        handler({
          fromPeerId,
          plaintext: decrypted,
          packetId: packet.id,
        });
      } catch {
        // Ignore invalid packet decode attempts.
      }
    });
  }

  async sendMessage(
    chatId: string,
    toPeerId: string,
    plaintext: string,
    route: RouteMode,
    expiresIn?: DisappearPolicy,
  ): Promise<ChatMessage> {
    await this.start();

    const encrypted = await encryptForTransport(plaintext, this.session, route);
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

    this.network.setRoute(route);
    let result = await this.network.sendPacket(encrypted, toPeerId);

    if (!result.delivered) {
      this.queue.incrementRetry(envelope.id);
      const fallback = this.network.nextFallbackRoute(route);
      this.network.setRoute(fallback);
      result = await this.network.sendPacket(
        {
          ...encrypted,
          route: fallback,
        },
        toPeerId,
      );
    }

    this.queue.updateState(envelope.id, result.delivered ? "sent" : "failed");
    if (result.delivered) {
      this.session = advanceRatchet(this.session);
    }

    return {
      id: `msg-${Date.now()}`,
      chatId,
      text: plaintext,
      fromMe: true,
      sentAtLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      delivery: result.delivered ? "sent" : "failed",
      expiresIn,
      routeUsed: result.routeUsed,
      cipherSuite: this.session.cipherSuite,
    };
  }
}
