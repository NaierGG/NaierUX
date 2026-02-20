import { normalizePeerId } from "./peer";

export interface InvitePayload {
  peerId: string;
  name?: string;
}

const INVITE_VERSION = "1";
const INVITE_SCHEME = "naier://invite";
const QR_IMAGE_BASE = "https://api.qrserver.com/v1/create-qr-code/";

function sanitizeName(name: string | undefined): string | undefined {
  if (!name) {
    return undefined;
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, 48);
}

export function createInvitePayload(payload: InvitePayload): string {
  const peerId = normalizePeerId(payload.peerId);
  const params = new URLSearchParams();
  params.set("v", INVITE_VERSION);
  params.set("peerId", peerId);
  const safeName = sanitizeName(payload.name);
  if (safeName) {
    params.set("name", safeName);
  }
  return `${INVITE_SCHEME}?${params.toString()}`;
}

export function buildInviteQrImageUrl(payload: InvitePayload, size = 220): string {
  const invite = createInvitePayload(payload);
  const safeSize = Number.isFinite(size) ? Math.max(120, Math.min(400, Math.floor(size))) : 220;
  return `${QR_IMAGE_BASE}?size=${safeSize}x${safeSize}&data=${encodeURIComponent(invite)}`;
}

export function parseInvitePayload(raw: string): InvitePayload | null {
  const input = raw.trim();
  if (!input) {
    return null;
  }

  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "naier:" || parsed.hostname !== "invite") {
      return null;
    }
    const peerId = parsed.searchParams.get("peerId");
    if (!peerId) {
      return null;
    }
    const name = sanitizeName(parsed.searchParams.get("name") ?? undefined);
    return {
      peerId: normalizePeerId(peerId),
      name,
    };
  } catch {
    // Ignore URL parse failures and try plain peer ID fallback.
  }

  if (input.toLowerCase().startsWith("peer-") || input.toLowerCase().includes("peer-")) {
    return {
      peerId: normalizePeerId(input),
    };
  }

  return null;
}
