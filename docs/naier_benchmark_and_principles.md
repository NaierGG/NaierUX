# Naier Benchmark and Product Principles (2026-02-19)

## Why This Benchmark Exists
Naier targets a difficult position: premium UX with strict privacy and no central control. The fastest path is to adopt proven ideas from existing privacy messengers and remove their known tradeoffs.

## Reference Products and Signals

### Signal
- Strong E2EE baseline and mature safety UX.
- Uses phone-number-based identity, although usernames are now available for private contact sharing.
- Metadata minimization exists (for example, sealed-sender design), but it is not a pure serverless P2P network.
- Naier take: keep Signal-grade cryptographic safety UX, remove phone-number dependency by default, and avoid centralized routing dependency.

### Session
- Account model is not phone-number based (Session ID).
- Onion-routed transport is a first-class design choice.
- Naier take: keep onion routing and identity privacy, add stronger real-time connection transparency and premium interaction polish.

### Briar
- Privacy-first messenger with Tor routing and local network modes (Bluetooth and Wi-Fi) for direct local resilience.
- Naier take: preserve resilient multi-transport thinking and local-first architecture while modernizing visual and call UX.

### SimpleX Chat
- No global user identifiers by default; privacy model minimizes identifier leakage.
- Strong local data ownership options and privacy controls.
- Naier take: keep metadata minimization and local ownership, add enterprise-grade anti-tamper message integrity and richer community UX.

### Matrix + Element
- Open protocol and decentralized federation with large ecosystem compatibility.
- E2EE exists but architecture is federation-centric, not pure P2P by default.
- Naier take: borrow interoperability mindset and room/community scalability patterns, but keep Naier transport as pure P2P-first.

## Naier Product Principles

1. Identity without authority
- 12/24-word recovery phrase is primary identity root.
- Fingerprint-first trust UX.
- No mandatory phone number, email, or central account server.

2. Route privacy before convenience
- Prefer direct P2P when possible.
- If direct path fails, fall back to multi-hop relay.
- Optional Tor mode with clear latency tradeoff indicator.

3. Local-first and deletion-resistant integrity
- Message state stored locally first with encrypted queue.
- Anti-delete protection: remote deletion cannot silently rewrite local truth.

4. Cryptography surfaced as UX, not hidden jargon
- Human-readable trust states, key-change alerts, and route labels.
- Security defaults on; advanced toggles available but not required.

5. High-end black cyber aesthetic without clutter
- Minimal interface density.
- Neon accents used only for intent and state, never decorative noise.

## Product Risks to Manage Early

1. Pure P2P availability vs battery/network constraints.
2. Tor mode latency impact on call quality.
3. Group-scale performance with strong privacy guarantees.
4. Cross-platform key backup usability without weakening threat model.

## Immediate Design Decisions for V1

1. Prioritize 1:1 messaging, identity, contacts, and secure file transfer first.
2. Ship call beta after robust route-quality signaling is in place.
3. Keep communities/channels in V1 scope but with explicit capacity guardrails.
4. Build route introspection UI from day one: `Direct P2P`, `2-hop Relay`, `Tor`.

## Source References

- Signal sealed sender metadata minimization:
  - https://signal.org/blog/sealed-sender/
- Signal phone number privacy and usernames:
  - https://support.signal.org/hc/en-us/articles/6712070553754-Phone-Number-Privacy-and-Usernames
- Session FAQ (metadata protection, onion routing, recovery phrase model):
  - https://getsession.org/faq
- Briar manual (central-server-free sync, Tor, Bluetooth/Wi-Fi resilience):
  - https://briarproject.org/manual/
- SimpleX network claims (no user IDs, local data ownership, decentralized model):
  - https://simplex.chat/
  - https://simplex.chat/messaging/
- Matrix E2EE implementation notes (Olm/Megolm in federated architecture):
  - https://matrix.org/docs/matrix-concepts/end-to-end-encryption/
