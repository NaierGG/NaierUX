# Naier Signaling Server Protocol

Date: 2026-02-19

## Endpoint

- WebSocket URL: `ws://<host>:<port>?peerId=<id>&ns=<namespace>&token=<authToken>`
- Default host/port: `127.0.0.1:8787`

## Query Parameters

- `peerId`: unique peer identifier
- `ns`: namespace (mesh partition)
- `token`: shared auth token (`SIGNAL_AUTH_TOKEN`)

## Server Message Types

1. `hello`
- sent on successful connect

2. `bootstrap_ack`
- response to client bootstrap frame

3. `signal`
- relayed offer/answer/candidate/hangup envelope (`ice` also accepted for compatibility)

4. `queued`
- recipient offline; message queued

5. `delivered`
- recipient online; message delivered

6. `error`
- validation/auth/schema failures
- shape:
```json
{
  "type": "error",
  "code": "rate_limited",
  "message": "Rate limit exceeded. Try again shortly."
}
```

## Client -> Server Frames

1. `bootstrap`
```json
{
  "type": "bootstrap",
  "namespace": "naier-demo-mesh",
  "peerId": "peer-naier-local",
  "envelope": { "...": "bootstrap envelope with auth" }
}
```

2. `signal`
```json
{
  "type": "signal",
  "namespace": "naier-demo-mesh",
  "peerId": "peer-naier-local",
  "envelope": { "...": "offer/answer/ice/hangup with auth+route" }
}
```

## Auth Validation

- Query token must match server `SIGNAL_AUTH_TOKEN`.
- Envelope `auth.signature` is verified as HMAC-SHA256 over:
  - `nonce + "|" + ts + "|" + canonical_envelope_payload`
- `auth.ts` must be within `SIGNAL_AUTH_TS_SKEW_MS` window.
- Nonce replay is rejected per `namespace + peerId` for `SIGNAL_NONCE_TTL_MS`.
- Route signature is verified when `route` object exists.

## Rate Limiting

- Per `namespace + peerId` window.
- Config:
  - `SIGNAL_RATE_LIMIT_WINDOW_MS`
  - `SIGNAL_RATE_LIMIT_MAX`
- Overflow returns `error(code=rate_limited)`.

## Queueing

- Offline recipient envelopes are queued in-memory.
- Queue key: `namespace + peerId`.
- Queue cap: `SIGNAL_MAX_QUEUE_PER_PEER`.

## Operational Notes

- Current server implementation: `server/signaling-server.js`.
- Designed as bootstrap relay for WebRTC signaling only, not message transport.
- Replace shared-token auth with per-device keys + rotating tickets for production.
