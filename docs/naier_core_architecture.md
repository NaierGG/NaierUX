# Naier Core Architecture (Phase 2/3 Implementation)

Date: 2026-02-19

## What Was Implemented

1. Crypto upgrade
- `src/core/crypto.ts`
- Primary scheme: `AES-256-GCM/HKDF-SHA256/HMAC-SHA256`
- Packet fields include IV, AAD, ratchet epoch, MAC, and scheme.
- Runtime capability detection exposes strong-crypto availability.
- `src/core/securityConfig.ts` enforces strict-by-default crypto policy.
- `compat` mode is now development-only via environment policy gate.

2. P2P adapter abstraction
- `src/core/network.ts`
- `NetworkAdapter` interface with start/stop, route control, packet send, and packet subscription.
- `InMemoryP2PAdapter` provides deterministic local simulation.
- `src/core/signaling.ts` provides signaling interface + two adapters:
  - authenticated in-memory signaling
  - authenticated WebSocket signaling (`AuthenticatedWebSocketSignalingAdapter`)
- `server/signaling-server.js` provides a compatible auth-checked relay server:
  - query token validation
  - HMAC envelope verification
  - namespace peer routing
  - bounded pending queue for offline peers
- signaling envelopes now include auth signature and onion route metadata.
- `src/core/webrtcP2PAdapter.ts` handles:
  - offer/answer/ICE + RTCDataChannel packet transport
  - route-aware ICE transport policy (`all` vs `relay`)
  - reconnect backoff and route-switch renegotiation

3. Messenger engine integration
- `src/core/messengerEngine.ts`
- Engine now depends on injected `NetworkAdapter`.
- Message send flow:
  - encrypt packet
  - enqueue local
  - send on selected route
  - fallback route retry once on failure
  - update delivery + ratchet

4. Shared call-state adapter
- `src/core/call.ts`
- `MockWebRTCCallAdapter` exposes start/end/toggle/switchRoute with live quality stats.
- `App.tsx` subscribes to this adapter, so call UI behavior is shared for mobile + Expo web target.

## Remaining Production Work

1. Replace placeholder TURN credentials and connect managed TURN deployment.
2. Move signaling auth from shared token to per-device key signatures and rotating auth tickets.
3. Replace mock call adapter with real media stream and SRTP/WebRTC transport handling.
