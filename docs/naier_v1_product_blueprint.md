# Naier V1 Product Blueprint

App Name: Naier  
Tagline: Talk without traces. Connect without masters.

## 1. Design System (Strict)

### Color Tokens
- `bg.primary`: `#000000` to `#0A0A0A` gradient (subtle noise overlay)
- `surface.card`: `#111111`
- `bubble.me`: `#1A1A1A`
- `bubble.me.glow`: `#00D4FF` (1px)
- `bubble.peer`: `#151515`
- `accent.main`: `#00FF9D`
- `accent.alert`: `#FF2E63`
- `accent.highlight`: `#7C3AED`
- `accent.cyber`: `#00D4FF`
- `text.primary`: `#F0F0F0`
- `text.secondary`: `#AAAAAA`
- `state.success`: `#39FF14`
- `state.danger`: `#FF2E63`

### Typography
- Default: Inter
- Headings: SF Pro Display
- Weights: 400, 500, 600
- Letter spacing: `-0.01em`

### Shape and Elevation
- Card radius: `12px`
- Bubble radius: `8px`
- Button radius: `4px`
- Shadows: subtle neon glow only on interactive/focus states

### Motion
- Default transition: `200ms ease-out`
- Send action: short neon pulse on message bubble and send icon

### Iconography
- Lucide icon style
- Stroke width: `1.5px`

## 2. Device Frame Defaults

- Primary target: iPhone 16 Pro (black titanium)
- Alternative target: Galaxy S25 Ultra
- Status bar: visible, `09:41`, full signal, `87%` battery
- Safe area:
  - Top padding: `16`
  - Horizontal gutters: `16`
  - Bottom action safe zone: `20`

## 3. Information Architecture

1. Splash + Onboarding
2. Recovery Phrase Setup / Import
3. Home / Chat List
4. New Chat + Global Search
5. Individual Chat Room
6. Group Chat Room
7. Voice / Video Call
8. Contacts + QR Scanner
9. Profile + My Keys
10. Settings (Security/Privacy first)
11. Appearance
12. Backup + Export

Persistent bottom nav (5 tabs):
- Chats
- Contacts
- Calls
- Communities
- Settings

## 4. Screen Specs (Figma-ready)

## 4.1 Splash + Onboarding (3 steps)
- Frame: full-screen gradient black with subtle noise.
- Center logo lockup:
  - Symbol: `72x72`
  - App name text: `28/34`, weight 600
  - Tagline: `14/20`, weight 400, secondary text
- Step carousel card:
  - Width: full minus `32`
  - Height: `360`
  - Radius: `12`
  - Background: `#111111`
- CTA:
  - Primary button `Create Identity`, height `48`, radius `4`
  - Secondary text button `Import Recovery Phrase`
- States: idle, loading identity entropy, error on insecure device state.

## 4.2 Recovery Phrase Setup / Import
- Top progress indicator: `step 2/3`
- Recovery phrase panel:
  - 12 chips grid (or 24 toggle)
  - Each chip: `min-height 40`, radius `8`, background `#151515`
- Security warning box:
  - Border `1px #FF2E63`
  - Icon + short warning text
- Confirmation task:
  - Ask words 3, 7, 11
- Import mode:
  - Paste field + word validation states
- CTA sticky footer: `Continue` disabled until valid.

## 4.3 Home / Chat List
- Header:
  - Left profile avatar `36`
  - Center title `Naier`
  - Right actions: new chat, search
- Route health strip:
  - Label + icon + bars
  - Values: `Direct P2P`, `2-hop Relay`, `Tor`
- Chat rows:
  - Height: `72`
  - Avatar `44`
  - Name, last message, timestamp, unread badge
  - Swipe actions: mute, archive, lock
- Empty state: privacy-first onboarding tips.

## 4.4 New Chat + Global Search
- Search field:
  - Height `44`, radius `10`, left icon, clear action
- Sections:
  - Recent contacts
  - Discover by public key fingerprint
  - Add via QR / NFC / link
- Result row:
  - Trust badge states: verified, unverified, changed key.

## 4.5 Individual Chat Room
- Header:
  - Back, avatar, contact name, trust indicator, call button
  - Subheader route state and latency
- Message list:
  - My bubble `#1A1A1A` with `#00D4FF` edge glow
  - Peer bubble `#151515`
  - Max bubble width `78%`
- Message metadata row:
  - Time
  - Encryption indicator
  - Expiration timer when disappearing enabled
- Composer:
  - Attachment, text field, mic, send
  - Height `52`
- Extras:
  - Screenshot-block indicator
  - Anti-delete marker when peer attempts delete.

## 4.6 Group Chat Room
- Same base as individual chat plus:
  - Group header with member count
  - Role chips: owner, moderator, member
  - Join route policy badge: direct only / onion enforced
- Moderation actions:
  - Message report
  - Ephemeral policy control

## 4.7 Voice / Video Call
- Full-screen dark stage
- Top row:
  - Contact/group name
  - Route quality + live bars
- Center:
  - Video tile(s) with soft rounded corners `12`
  - Audio-only mode: avatar waveform ring
- Bottom controls:
  - Mute, camera, route switch, speaker, end call
  - End button danger accent

## 4.8 Contacts + QR Scanner
- Tabs: Contacts / Requests / Blocked
- QR button prominent in header
- Scanner overlay:
  - Frame guide `280x280`
  - Neon corners `#00FF9D`
- Contact card:
  - Fingerprint preview + trust state
  - Verify in-person action

## 4.9 Profile + My Keys
- Profile section:
  - Avatar, display name, status message
- Key section:
  - Public key fingerprint (copy, share QR)
  - Identity age
  - Last key rotation
- Security posture card:
  - Device lock status
  - Backup status

## 4.10 Settings (Security first)
- Ordered sections:
  - Privacy
  - Security
  - Network
  - Notifications
  - Data
- Critical toggles:
  - Require biometric unlock
  - Disappearing message default
  - Block screenshots
  - Tor default route

## 4.11 Appearance
- Dark-only lock enforced
- Accent picker chips:
  - Main `#00FF9D`
  - Alert `#FF2E63`
  - Highlight `#7C3AED`
  - Cyber `#00D4FF`
- Preview mini chat for instant feedback.

## 4.12 Backup + Export
- Backup modes:
  - Local encrypted backup
  - Air-gapped export package
  - Recovery phrase verification
- Warning module:
  - Red bordered threat note for insecure cloud destinations
- Export includes:
  - Encrypted history bundle
  - Contact fingerprints
  - Key metadata

## 5. Core User Flows

## 5.1 First Run
1. Splash -> onboarding step 1-3.
2. User creates 12/24-word phrase.
3. User verifies selected words.
4. Local identity keypair generated.
5. Home opens with connection health strip.

## 5.2 Add Contact (QR)
1. Contacts tab -> QR scan.
2. Scan public key link.
3. Compare short fingerprint.
4. Mark verified and open chat.

## 5.3 Secure Messaging with Expiry
1. Open chat -> set disappearing timer.
2. Send message -> local queue encrypts before transport.
3. Route state shown in header.
4. Expiration countdown visible per message.
5. Anti-delete marker keeps forensic integrity locally.

## 5.4 Call with Route Fallback
1. Start voice/video call.
2. Attempt direct P2P.
3. If failed, switch to relay.
4. If privacy strict mode on, force Tor path.
5. Show quality bars and route label in-call.

## 6. Full-Stack Technical Blueprint

## 6.1 Client Stack
- React Native + TypeScript
- Local encrypted database (SQLCipher/SQLite)
- Secure key storage via OS keystore/secure enclave

## 6.2 Identity and Crypto
- Identity seed from recovery phrase (BIP39-style mnemonic UX)
- Long-term identity key + rotating prekeys
- Session establishment: X3DH-style handshake
- Messaging: Double Ratchet with forward secrecy
- Optional hybrid post-quantum mode for future-hardening

## 6.3 Network Layer
- Pure P2P transport first
- NAT traversal via ICE/STUN-like strategies
- Multi-hop relay fallback with onion packet wrapping
- Optional Tor integration as explicit route policy
- Offline queue retries with exponential backoff and delivery proofs

## 6.4 Trust and Integrity
- Trust states:
  - Verified fingerprint
  - Unverified
  - Key changed
- Anti-delete protection:
  - Local append-only event log
  - Remote delete requests are represented as redaction events, not destructive rewrite

## 6.5 Large File Transfer
- Chunked encrypted streaming up to `2GB`
- Resume support with per-chunk MAC validation
- Route-aware transfer strategy (direct preferred)

## 7. Interaction States and Edge Cases

1. No network: queue locally and display `Pending local`.
2. Relay unavailable: prompt fallback route suggestions.
3. Key changed mid-session: hard warning, block send until user confirms.
4. Screenshot attempt (supported platforms): block + local security log entry.
5. Device compromise suspicion: panic lock and optional self-wipe policy.

## 8. Immediate Build Plan

1. Implement design tokens and component library (`Button`, `Input`, `Bubble`, `RouteBadge`).
2. Build screens 1-5 with static data and full navigation.
3. Integrate local encrypted store and identity generation flow.
4. Add transport simulation layer (`direct`, `relay`, `tor`) before real networking.
5. Ship internal prototype and run UX review on trust-state clarity.
