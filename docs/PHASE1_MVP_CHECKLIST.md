# NaierUX Phase 1 MVP Checklist (App/Web)

Date: 2026-02-20

## P0 Must-Have (Ship Gate)

1. Two devices on different networks can connect (Wi-Fi/LTE).
- Why: LAN-only success does not prove real-world usability.

2. Message send is blocked 100% before `secure`.
- Why: This is the core E2E security boundary.

3. Identity persists across app/web restart.
- Why: Stable peer identity is required for trust, QR invites, and ongoing chats.

4. Failure states are explicit and user-readable.
- Why: Users must know whether failure is handshake, signaling, or network/NAT related.

5. QR-based peer add completes within 10 seconds (normal path).
- Why: Onboarding speed directly controls first-session conversion.

6. Signaling hardening is active: auth, nonce replay rejection, rate limiting.
- Why: Free infrastructure gets abused quickly without basic protection.

7. WebRTC messaging path is default in production-like web runtime.
- Why: In-memory paths do not validate real connectivity.

8. 1:1 voice call succeeds at least once on web (when media permissions are available).
- Why: Confirms real-time channel setup beyond text messaging.

## P1 Important (Post-Gate)

1. TURN guidance appears when cross-network P2P fails.
- Why: Keeps zero-cost STUN default while giving a practical recovery path.

2. Invite payload validation rejects malformed/self payload cleanly.
- Why: Prevents broken onboarding and accidental self-connect loops.

3. One-action start from applied invite payload.
- Why: Reduces taps and supports the 10-second onboarding target.

## Not Required in Phase 1

1. Group chat/group calling.
- Why: Complexity and failure surface are much higher; does not block MVP validation.

2. DHT/Tor production routing implementation.
- Why: Out of Phase 1 scope and unnecessary for 2-10 user MVP proof.

3. TURN as default.
- Why: Conflicts with zero-cost baseline; keep as optional fallback.

4. Rich social/chat extras (stickers, reactions, advanced media features).
- Why: Reliability/security onboarding must be validated first.

## Manual Verification Script (Recommended)

1. Start signaling server and open two browser clients on different networks.
2. Exchange peer IDs via QR invite payload.
3. Confirm chat start and first message send.
4. Confirm pre-secure send attempts are blocked with clear message.
5. Confirm secure state and successful round-trip message.
6. Reload both clients; confirm same identity/peer ID.
7. Trigger replay/rate-limit checks against signaling server.
8. Place one 1:1 voice call and verify connect/end state transitions.
