# NaierUX Zero-Cost Deploy (Phase 1)

## 1) Web Deploy: Cloudflare Pages

Use Expo web export output (`dist`) as the Pages artifact.

- Build command:
```bash
npx expo export --platform web
```
- Output directory:
```bash
dist
```

### Pages setup checklist

1. Connect this repo in Cloudflare Pages.
2. Set framework preset to `None` (custom build).
3. Build command: `npx expo export --platform web`
4. Build output directory: `dist`
5. Add required env vars in Pages project settings:
   - `EXPO_PUBLIC_NAIER_SIGNALING_URL`
   - `EXPO_PUBLIC_NAIER_SIGNALING_TOKEN`
   - `EXPO_PUBLIC_NAIER_SIGNAL_NAMESPACE`
   - Optional: `EXPO_PUBLIC_NAIER_STUN_URLS`

## 2) Signaling Zero-Cost Option (Dev/Test)

Use local Node signaling server + Cloudflare Tunnel.

### Start local signaling server

```bash
npm run signal:server
```

### Expose local signaling with tunnel

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

Cloudflare returns a public HTTPS URL like:

```text
https://<random-subdomain>.trycloudflare.com
```

Convert to WebSocket URL for app config:

```text
wss://<random-subdomain>.trycloudflare.com
```

Set that URL as:

- `NAIER_SIGNALING_URL` (local env), or
- `EXPO_PUBLIC_NAIER_SIGNALING_URL` (Pages env)

## 3) Env Separation Rules (Required)

`NAIER_MESSAGE_KEY` and `NAIER_SIGNALING_TOKEN` must be different values.

- Message key protects app message crypto domain.
- Signaling token protects signaling authentication domain.
- Do not reuse one key for both.

Generate each token independently:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Assign one to `NAIER_MESSAGE_KEY`, the other to `NAIER_SIGNALING_TOKEN` / `SIGNAL_AUTH_TOKEN`.

## 4) NAT / TURN Guidance

- Default is STUN-only for zero-cost MVP.
- If cross-network connection (Wi-Fi/LTE) frequently fails, configure optional TURN vars:
  - `NAIER_TURN_URLS`
  - `NAIER_TURN_USERNAME`
  - `NAIER_TURN_CREDENTIAL`

TURN is optional and not enabled by default in Phase 1.
