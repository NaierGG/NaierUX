# Naier (App + Web Prototype)

Naier is a privacy-first decentralized messenger prototype.

## Current Capabilities

- Local identity with recovery phrase
- Identity persistence (restarts keep the same peer identity)
- ECDH key agreement + handshake state machine (`hello -> key_exchange -> ack -> secure`)
- TOFU + key-change detection (`changed_key`) + manual approve/verify
- Route-aware messaging (`Direct P2P`, `2-hop Relay`, `Tor`)
- Encrypted app-state persistence (chats/contacts/messages/settings)
- Friend request flow (outgoing/incoming, accept/decline, block/unblock)
- Invite onboarding via QR payload (live) + optional Web NFC scan attempt
- Encrypted backup payload export/import from the app
- WebRTC messaging adapter with authenticated signaling
- WebRTC call adapter (real runtime where supported; explicit disabled state otherwise)

## Project Structure

- `App.tsx`: React Native app shell
- `src/core`: identity, crypto/session, queue, transport, messenger engine, call adapter, signaling, P2P adapters
- `src/context`: app/engine state providers
- `src/screens`: UI screens
- `src/state`: peer/app/identity persistence utilities
- `server/signaling-server.js`: authenticated signaling server
- `tests/e2e/runE2E.ts`: deterministic E2E scenarios
- `web/`: standalone web UI

## Run

1. Install:

```bash
npm install
```

PowerShell execution-policy environments can use:

```bash
npm.cmd install
```

2. Start signaling server:

```bash
npm run signal:server
```

3. Start app:

```bash
npm run start
```

4. Open targets:

- Mobile: Expo Go or emulator
- Web: press `w` in Expo CLI

Cloudflare Pages + Tunnel deployment guide:

- `docs/DEPLOY_CLOUDFLARE.md`
- `docs/PHASE1_MVP_CHECKLIST.md`

## Runtime Flags

- `NAIER_CRYPTO_POLICY`: `strict` or `compat`
- `NAIER_MESSAGE_KEY`: shared message key (required, min 16 chars)
- `NAIER_STORAGE_KEY`: optional dedicated local encrypted-storage key
- `NAIER_SIGNALING_URL`: WebSocket signaling endpoint
- `NAIER_SIGNALING_TOKEN`: signaling auth token (required for ws signaling, min 16 chars)
- `NAIER_SIGNAL_NAMESPACE`: signaling namespace
- `NAIER_ALLOW_IN_MEMORY`: `1` allows local in-memory fallback; `0` keeps real network mode only
- `NAIER_MESSAGE_KEY` and `NAIER_SIGNALING_TOKEN` must be different values

### STUN/TURN

- `NAIER_STUN_URLS`: comma-separated STUN URLs
- `NAIER_TURN_URLS`: comma-separated TURN URLs
- `NAIER_TURN_USERNAME`: TURN username
- `NAIER_TURN_CREDENTIAL`: TURN credential

### Signaling Server

- `SIGNAL_HOST`, `SIGNAL_PORT`, `SIGNAL_AUTH_TOKEN`
- `SIGNAL_PING_MS`, `SIGNAL_MAX_PAYLOAD_BYTES`, `SIGNAL_MAX_QUEUE_PER_PEER`
- `SIGNAL_RATE_LIMIT_WINDOW_MS`, `SIGNAL_RATE_LIMIT_MAX`
- `SIGNAL_NONCE_TTL_MS`, `SIGNAL_AUTH_TS_SKEW_MS`

## Security Notes

- Strong crypto path uses AES-GCM + HKDF(SHA-256) + HMAC(SHA-256)
- Message key derives from `NAIER_MESSAGE_KEY` (or signaling token fallback)
- Strict policy blocks insecure fallback paths in non-compat mode
- Peer key and trust state are persisted locally
- App-state backup payloads are encrypted
- Signaling auth verifies `nonce + ts + signature` and rejects replayed nonces

## Key Generation

Generate separate 32-byte secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Use one for `NAIER_MESSAGE_KEY`, and the other for `NAIER_SIGNALING_TOKEN` / `SIGNAL_AUTH_TOKEN`.

## E2E Tests

```bash
npm run test:e2e
```

Scenarios include:

- handshake completion and encrypted message delivery
- peer key rotation detection
- encrypted app-state persistence round-trip
- identity persistence round-trip
