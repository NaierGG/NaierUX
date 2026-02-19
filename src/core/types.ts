export type RouteMode = "Direct P2P" | "2-hop Relay" | "Tor";

export type DisappearPolicy = "5 min" | "1 h" | "24 h" | "30 d";

export type TrustState = "verified" | "unverified" | "changed_key";

export type DeliveryState = "queued_local" | "sending" | "sent" | "failed";

export interface IdentityProfile {
  displayName: string;
  recoveryWords: string[];
  publicFingerprint: string;
  createdAtIso: string;
}

export interface ChatPreview {
  id: string;
  name: string;
  lastMessage: string;
  timeLabel: string;
  unread: number;
  trust: TrustState;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  text: string;
  fromMe: boolean;
  sentAtLabel: string;
  delivery: DeliveryState;
  expiresIn?: DisappearPolicy;
  routeUsed?: RouteMode;
  cipherSuite?: string;
}

export interface RouteStatus {
  route: RouteMode;
  bars: number;
  latencyMs: number;
  label: string;
}

export interface EncryptedPacket {
  id: string;
  scheme: "AES-256-GCM/HKDF-SHA256/HMAC-SHA256" | "LEGACY-DEMO";
  iv: string;
  aad: string;
  ratchetEpoch: number;
  ciphertext: string;
  mac: string;
  route: RouteMode;
  createdAtIso: string;
}

export interface QueueEnvelope {
  id: string;
  chatId: string;
  plaintext: string;
  encrypted: EncryptedPacket;
  retries: number;
  state: DeliveryState;
}
