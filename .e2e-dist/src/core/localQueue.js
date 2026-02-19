"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalMessageQueue = void 0;
class LocalMessageQueue {
    constructor() {
        this.envelopes = [];
    }
    enqueue(envelope) {
        this.envelopes.unshift(envelope);
    }
    list() {
        return [...this.envelopes];
    }
    updateState(id, state) {
        this.envelopes = this.envelopes.map((envelope) => envelope.id === id ? { ...envelope, state } : envelope);
    }
    incrementRetry(id) {
        this.envelopes = this.envelopes.map((envelope) => envelope.id === id ? { ...envelope, retries: envelope.retries + 1 } : envelope);
    }
    remove(id) {
        this.envelopes = this.envelopes.filter((envelope) => envelope.id !== id);
    }
    serialize() {
        return JSON.stringify(this.envelopes);
    }
    hydrate(serialized) {
        try {
            const parsed = JSON.parse(serialized);
            if (!Array.isArray(parsed)) {
                return;
            }
            this.envelopes = parsed;
        }
        catch {
            // Ignore corrupted local queue snapshot.
        }
    }
}
exports.LocalMessageQueue = LocalMessageQueue;
