import type { QueueEnvelope } from "./types";

export class LocalMessageQueue {
  private envelopes: QueueEnvelope[] = [];

  enqueue(envelope: QueueEnvelope): void {
    this.envelopes.unshift(envelope);
  }

  list(): QueueEnvelope[] {
    return [...this.envelopes];
  }

  updateState(id: string, state: QueueEnvelope["state"]): void {
    this.envelopes = this.envelopes.map((envelope) =>
      envelope.id === id ? { ...envelope, state } : envelope,
    );
  }

  incrementRetry(id: string): void {
    this.envelopes = this.envelopes.map((envelope) =>
      envelope.id === id ? { ...envelope, retries: envelope.retries + 1 } : envelope,
    );
  }

  remove(id: string): void {
    this.envelopes = this.envelopes.filter((envelope) => envelope.id !== id);
  }

  serialize(): string {
    return JSON.stringify(this.envelopes);
  }

  hydrate(serialized: string): void {
    try {
      const parsed = JSON.parse(serialized) as QueueEnvelope[];
      if (!Array.isArray(parsed)) {
        return;
      }
      this.envelopes = parsed;
    } catch {
      // Ignore corrupted local queue snapshot.
    }
  }
}
