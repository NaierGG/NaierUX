/* eslint-disable no-console */
const http = require("node:http");
const { createHash, createHmac, timingSafeEqual } = require("node:crypto");

function env(name, fallback) {
  const value = process.env[name];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return fallback;
}

function envInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

const HOST = env("SIGNAL_HOST", "127.0.0.1");
const PORT = envInt("SIGNAL_PORT", 8787);
const AUTH_TOKEN = env("SIGNAL_AUTH_TOKEN", "dev-signaling-secret");
const PING_INTERVAL_MS = envInt("SIGNAL_PING_MS", 25000);
const MAX_PAYLOAD_BYTES = envInt("SIGNAL_MAX_PAYLOAD_BYTES", 1024 * 256);
const MAX_QUEUE_PER_PEER = envInt("SIGNAL_MAX_QUEUE_PER_PEER", 200);
const RATE_LIMIT_WINDOW_MS = envInt("SIGNAL_RATE_LIMIT_WINDOW_MS", 10000);
const RATE_LIMIT_MAX = envInt("SIGNAL_RATE_LIMIT_MAX", 80);
const NONCE_TTL_MS = envInt("SIGNAL_NONCE_TTL_MS", 5 * 60 * 1000);
const AUTH_TS_SKEW_MS = envInt("SIGNAL_AUTH_TS_SKEW_MS", 60 * 1000);

const VALID_ID = /^[a-zA-Z0-9._:-]{3,128}$/;
const WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const SUPPORTED_SIGNAL_TYPES = new Set(["bootstrap", "offer", "answer", "ice", "candidate", "hangup"]);

const namespaces = new Map();
const pending = new Map();
const peerRateState = new Map();
const peerNonceState = new Map();

function makeNamespaceState(namespace) {
  let state = namespaces.get(namespace);
  if (!state) {
    state = new Map();
    namespaces.set(namespace, state);
  }
  return state;
}

function pendingKey(namespace, peerId) {
  return `${namespace}::${peerId}`;
}

function logEvent(event, fields = {}) {
  const encoded = JSON.stringify(fields);
  console.log(`[Naier Signal] ${event} ${encoded}`);
}

function errorMessage(code) {
  switch (code) {
    case "invalid_json":
      return "Malformed JSON payload.";
    case "session_missing":
      return "WebSocket session is missing.";
    case "namespace_mismatch":
      return "Namespace does not match current session.";
    case "peer_mismatch":
      return "Peer ID does not match current session.";
    case "unsupported_type":
      return "Unsupported message type.";
    case "unsupported_signal_type":
      return "Unsupported signaling envelope type.";
    case "envelope_missing":
      return "Signaling envelope is missing.";
    case "invalid_peer_id_format":
      return "Peer ID format is invalid.";
    case "invalid_auth_signature":
      return "Envelope auth signature is invalid.";
    case "invalid_auth_ts":
      return "Envelope auth timestamp is outside the allowed window.";
    case "replay_detected":
      return "Replay detected: nonce already used.";
    case "invalid_route_signature":
      return "Envelope route signature is invalid.";
    case "rate_limited":
      return "Rate limit exceeded. Try again shortly.";
    default:
      if (code.startsWith("invalid_")) {
        return "Envelope has missing or invalid required fields.";
      }
      return "Invalid signaling request.";
  }
}

function sendError(connection, code) {
  const message = errorMessage(code);
  const peerId = connection?.session?.peerId ?? "unknown";
  const namespace = connection?.session?.namespace ?? "unknown";
  sendJson(connection, { type: "error", code, message });
  logEvent("error", { peerId, namespace, code });
}

function canonicalSignalPayload(envelope) {
  return JSON.stringify({
    id: envelope.id,
    fromPeerId: envelope.fromPeerId,
    toPeerId: envelope.toPeerId,
    sessionId: envelope.sessionId,
    type: envelope.type,
    payload: envelope.payload,
    createdAtIso: envelope.createdAtIso,
    route: envelope.route,
  });
}

function hmacHex(secret, payload) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqualHex(a, b) {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function cleanupNonceState(namespace, peerId, nowMs = Date.now()) {
  const key = pendingKey(namespace, peerId);
  const state = peerNonceState.get(key);
  if (!state) {
    return;
  }
  for (const [nonce, ts] of state.entries()) {
    if (nowMs - ts > NONCE_TTL_MS) {
      state.delete(nonce);
    }
  }
  if (state.size === 0) {
    peerNonceState.delete(key);
  }
}

function checkAndStoreNonce(namespace, peerId, nonce, ts) {
  const key = pendingKey(namespace, peerId);
  cleanupNonceState(namespace, peerId);
  let state = peerNonceState.get(key);
  if (!state) {
    state = new Map();
    peerNonceState.set(key, state);
  }
  if (state.has(nonce)) {
    return "replay_detected";
  }
  state.set(nonce, ts);
  return null;
}

function verifyAuth(envelope, namespace, sessionPeerId) {
  if (!envelope.auth || typeof envelope.auth !== "object") {
    return "invalid_auth_signature";
  }
  const { nonce, ts, signature } = envelope.auth;
  if (typeof nonce !== "string" || typeof signature !== "string" || typeof ts !== "number") {
    return "invalid_auth_signature";
  }
  if (!Number.isFinite(ts)) {
    return "invalid_auth_ts";
  }
  const nowMs = Date.now();
  if (Math.abs(nowMs - ts) > AUTH_TS_SKEW_MS) {
    return "invalid_auth_ts";
  }
  const replayError = checkAndStoreNonce(namespace, sessionPeerId, nonce, ts);
  if (replayError) {
    return replayError;
  }
  const canonical = canonicalSignalPayload(envelope);
  const expected = hmacHex(AUTH_TOKEN, `${nonce}|${ts}|${canonical}`);
  return safeEqualHex(expected, signature) ? null : "invalid_auth_signature";
}

function verifyRoute(route) {
  if (!route) return true;
  if (
    typeof route.mode !== "string" ||
    !Array.isArray(route.hops) ||
    typeof route.issuedAtIso !== "string" ||
    typeof route.signature !== "string"
  ) {
    return false;
  }
  const expected = hmacHex(AUTH_TOKEN, `${route.mode}|${route.hops.join(">")}|${route.issuedAtIso}`);
  return safeEqualHex(expected, route.signature);
}

function validateEnvelope(envelope, namespace, sessionPeerId) {
  if (!envelope || typeof envelope !== "object") return "envelope_missing";
  const required = ["id", "fromPeerId", "toPeerId", "sessionId", "type", "createdAtIso"];
  for (const key of required) {
    if (typeof envelope[key] !== "string" || envelope[key].length === 0) {
      return `invalid_${key}`;
    }
  }
  if (!VALID_ID.test(envelope.fromPeerId) || !VALID_ID.test(envelope.toPeerId)) {
    return "invalid_peer_id_format";
  }
  if (!SUPPORTED_SIGNAL_TYPES.has(envelope.type)) {
    return "unsupported_signal_type";
  }
  if (envelope.fromPeerId !== sessionPeerId) {
    return "peer_mismatch";
  }
  const authError = verifyAuth(envelope, namespace, sessionPeerId);
  if (authError) {
    return authError;
  }
  if (!verifyRoute(envelope.route)) {
    return "invalid_route_signature";
  }
  return null;
}

function cleanupPeerRateState(namespace, peerId) {
  const key = pendingKey(namespace, peerId);
  peerRateState.delete(key);
  peerNonceState.delete(key);
}

function checkRateLimit(namespace, peerId) {
  const key = pendingKey(namespace, peerId);
  const nowMs = Date.now();
  const existing = peerRateState.get(key);
  if (!existing || nowMs - existing.windowStartMs > RATE_LIMIT_WINDOW_MS) {
    peerRateState.set(key, {
      windowStartMs: nowMs,
      count: 1,
    });
    return false;
  }
  existing.count += 1;
  return existing.count > RATE_LIMIT_MAX;
}

function encodeFrame(opcode, payloadBuffer) {
  const payload = payloadBuffer || Buffer.alloc(0);
  const length = payload.length;
  let header;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = length;
  } else if (length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

function decodeFrame(buffer) {
  if (buffer.length < 2) return null;

  const byte1 = buffer[0];
  const byte2 = buffer[1];
  const opcode = byte1 & 0x0f;
  const masked = (byte2 & 0x80) !== 0;
  let payloadLength = byte2 & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < offset + 2) return null;
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    if (buffer.length < offset + 8) return null;
    const lengthBigInt = buffer.readBigUInt64BE(offset);
    offset += 8;
    if (lengthBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("Frame too large.");
    }
    payloadLength = Number(lengthBigInt);
  }

  let mask;
  if (masked) {
    if (buffer.length < offset + 4) return null;
    mask = buffer.slice(offset, offset + 4);
    offset += 4;
  }

  if (payloadLength > MAX_PAYLOAD_BYTES) {
    throw new Error("Payload exceeds configured max size.");
  }
  if (buffer.length < offset + payloadLength) return null;

  const payload = Buffer.from(buffer.slice(offset, offset + payloadLength));
  if (masked && mask) {
    for (let i = 0; i < payload.length; i += 1) {
      payload[i] ^= mask[i % 4];
    }
  }

  const consumed = offset + payloadLength;
  return {
    opcode,
    payload,
    consumed,
  };
}

function sendFrame(connection, opcode, payloadBuffer) {
  if (!connection || connection.closed) return;
  try {
    connection.socket.write(encodeFrame(opcode, payloadBuffer));
  } catch {
    closeConnection(connection);
  }
}

function sendJson(connection, payload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8");
  sendFrame(connection, 0x1, encoded);
}

function sendClose(connection, code = 1000, reason = "") {
  if (!connection || connection.closed) return;
  const reasonBuffer = Buffer.from(String(reason).slice(0, 120), "utf8");
  const payload = Buffer.alloc(2 + reasonBuffer.length);
  payload.writeUInt16BE(code, 0);
  reasonBuffer.copy(payload, 2);
  sendFrame(connection, 0x8, payload);
}

function cleanupConnectionSession(connection, reason = "closed") {
  const activeSession = connection?.session;
  if (!activeSession || connection.sessionCleaned) {
    return;
  }
  connection.sessionCleaned = true;
  const namespaceState = namespaces.get(activeSession.namespace);
  if (namespaceState) {
    const current = namespaceState.get(activeSession.peerId);
    if (current && current.connection === connection) {
      namespaceState.delete(activeSession.peerId);
    }
    if (namespaceState.size === 0) {
      namespaces.delete(activeSession.namespace);
    }
  }
  cleanupPeerRateState(activeSession.namespace, activeSession.peerId);
  logEvent("connection_closed", {
    namespace: activeSession.namespace,
    peerId: activeSession.peerId,
    reason,
  });
}

function closeConnection(connection) {
  if (!connection || connection.closed) return;
  connection.closed = true;
  cleanupConnectionSession(connection, "socket_destroy");
  try {
    connection.socket.destroy();
  } catch {
    // Ignore close errors.
  }
}

function pushPending(namespace, toPeerId, wireMessage) {
  const key = pendingKey(namespace, toPeerId);
  const list = pending.get(key) ?? [];
  list.push(wireMessage);
  if (list.length > MAX_QUEUE_PER_PEER) {
    list.shift();
  }
  pending.set(key, list);
}

function flushPending(namespace, peerId, connection) {
  const key = pendingKey(namespace, peerId);
  const list = pending.get(key);
  if (!list || list.length === 0) return;
  list.forEach((message) => sendJson(connection, message));
  pending.delete(key);
}

function parseConnectionParams(urlString = "") {
  try {
    const parsed = new URL(urlString, `ws://${HOST}:${PORT}`);
    const peerId = parsed.searchParams.get("peerId") || "";
    const namespace = parsed.searchParams.get("ns") || "naier-signal";
    const token = parsed.searchParams.get("token") || "";
    return { peerId, namespace, token };
  } catch {
    return { peerId: "", namespace: "naier-signal", token: "" };
  }
}

function responseAndDestroy(socket, statusCode, reason) {
  try {
    socket.write(
      `HTTP/1.1 ${statusCode} ${reason}\r\n` +
        "Connection: close\r\n" +
        "Content-Type: text/plain\r\n" +
        "Content-Length: 0\r\n\r\n",
    );
  } catch {
    // Ignore write failures.
  }
  try {
    socket.destroy();
  } catch {
    // Ignore destroy failures.
  }
}

function createWebSocketConnection(socket, req) {
  const key = req.headers["sec-websocket-key"];
  if (typeof key !== "string" || key.length === 0) {
    responseAndDestroy(socket, 400, "Bad Request");
    return null;
  }
  const accept = createHash("sha1").update(`${key}${WS_MAGIC}`).digest("base64");
  const headers = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "\r\n",
  ];
  socket.write(headers.join("\r\n"));

  return {
    socket,
    frameBuffer: Buffer.alloc(0),
    closed: false,
    isAlive: true,
    session: null,
    sessionCleaned: false,
  };
}

function handleFrame(connection, frame) {
  if (frame.opcode === 0x8) {
    sendClose(connection, 1000, "bye");
    closeConnection(connection);
    return;
  }
  if (frame.opcode === 0x9) {
    sendFrame(connection, 0xA, frame.payload);
    return;
  }
  if (frame.opcode === 0xA) {
    connection.isAlive = true;
    return;
  }
  if (frame.opcode !== 0x1) {
    return;
  }

  let incoming;
  try {
    incoming = JSON.parse(frame.payload.toString("utf8"));
  } catch {
    sendError(connection, "invalid_json");
    return;
  }

  const activeSession = connection.session;
  if (!activeSession) {
    sendError(connection, "session_missing");
    return;
  }

  if (incoming.namespace !== activeSession.namespace) {
    sendError(connection, "namespace_mismatch");
    return;
  }
  if (incoming.peerId !== activeSession.peerId) {
    sendError(connection, "peer_mismatch");
    return;
  }

  if (checkRateLimit(activeSession.namespace, activeSession.peerId)) {
    sendError(connection, "rate_limited");
    return;
  }

  if (incoming.type === "bootstrap") {
    const bootstrapValidationError = validateEnvelope(
      incoming.envelope,
      activeSession.namespace,
      activeSession.peerId,
    );
    if (bootstrapValidationError) {
      sendError(connection, bootstrapValidationError);
      return;
    }
    sendJson(connection, {
      type: "bootstrap_ack",
      namespace: activeSession.namespace,
      peerId: activeSession.peerId,
      serverTimeIso: new Date().toISOString(),
    });
    logEvent("bootstrap_ack", {
      namespace: activeSession.namespace,
      peerId: activeSession.peerId,
    });
    return;
  }

  if (incoming.type !== "signal") {
    sendError(connection, "unsupported_type");
    return;
  }

  const validationError = validateEnvelope(incoming.envelope, activeSession.namespace, activeSession.peerId);
  if (validationError) {
    sendError(connection, validationError);
    return;
  }

  const envelope = incoming.envelope;
  const targetPeer = envelope.toPeerId;
  const wireMessage = {
    type: "signal",
    namespace: activeSession.namespace,
    peerId: activeSession.peerId,
    envelope,
  };

  const namespaceState = makeNamespaceState(activeSession.namespace);
  const targetSession = namespaceState.get(targetPeer);

  if (!targetSession || targetSession.connection.closed) {
    pushPending(activeSession.namespace, targetPeer, wireMessage);
    sendJson(connection, {
      type: "queued",
      namespace: activeSession.namespace,
      peerId: activeSession.peerId,
      toPeerId: targetPeer,
      envelopeId: envelope.id,
    });
    logEvent("signal_queued", {
      namespace: activeSession.namespace,
      peerId: activeSession.peerId,
      toPeerId: targetPeer,
      signalType: envelope.type,
    });
    return;
  }

  sendJson(targetSession.connection, wireMessage);
  sendJson(connection, {
    type: "delivered",
    namespace: activeSession.namespace,
    peerId: activeSession.peerId,
    toPeerId: targetPeer,
    envelopeId: envelope.id,
    deliveredAtIso: new Date().toISOString(),
  });
  logEvent("signal_delivered", {
    namespace: activeSession.namespace,
    peerId: activeSession.peerId,
    toPeerId: targetPeer,
    signalType: envelope.type,
  });
}

function bindConnectionHandlers(connection) {
  connection.socket.on("data", (chunk) => {
    if (connection.closed) return;
    connection.frameBuffer = Buffer.concat([connection.frameBuffer, chunk]);
    while (connection.frameBuffer.length > 0) {
      let frame;
      try {
        frame = decodeFrame(connection.frameBuffer);
      } catch (error) {
        sendClose(connection, 1009, error instanceof Error ? error.message : "frame_error");
        closeConnection(connection);
        return;
      }
      if (!frame) {
        break;
      }
      connection.frameBuffer = connection.frameBuffer.slice(frame.consumed);
      handleFrame(connection, frame);
    }
  });

  connection.socket.on("close", () => {
    connection.closed = true;
    cleanupConnectionSession(connection, "socket_close");
  });

  connection.socket.on("error", () => {
    cleanupConnectionSession(connection, "socket_error");
    closeConnection(connection);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not_found" }));
});

server.on("upgrade", (req, socket) => {
  const upgradeHeader = String(req.headers.upgrade || "").toLowerCase();
  const connectionHeader = String(req.headers.connection || "").toLowerCase();
  if (upgradeHeader !== "websocket" || !connectionHeader.includes("upgrade")) {
    responseAndDestroy(socket, 400, "Bad Request");
    return;
  }

  const { peerId, namespace, token } = parseConnectionParams(req.url);
  if (!VALID_ID.test(peerId)) {
    responseAndDestroy(socket, 400, "Invalid Peer");
    return;
  }
  if (!VALID_ID.test(namespace)) {
    responseAndDestroy(socket, 400, "Invalid Namespace");
    return;
  }
  if (token !== AUTH_TOKEN) {
    responseAndDestroy(socket, 401, "Unauthorized");
    return;
  }

  const connection = createWebSocketConnection(socket, req);
  if (!connection) return;

  const session = {
    namespace,
    peerId,
    connectedAtIso: new Date().toISOString(),
  };
  connection.session = session;
  connection.socket.setNoDelay(true);

  const nsState = makeNamespaceState(namespace);
  const existing = nsState.get(peerId);
  if (existing && existing.connection !== connection) {
    sendClose(existing.connection, 4409, "peer_replaced");
    cleanupConnectionSession(existing.connection, "peer_replaced");
    closeConnection(existing.connection);
  }
  nsState.set(peerId, { connection, session });
  logEvent("connection_opened", { namespace, peerId });

  bindConnectionHandlers(connection);

  sendJson(connection, {
    type: "hello",
    namespace,
    peerId,
    serverTimeIso: new Date().toISOString(),
  });
  flushPending(namespace, peerId, connection);
});

const pingTimer = setInterval(() => {
  namespaces.forEach((peerMap) => {
    peerMap.forEach((entry) => {
      const connection = entry.connection;
      if (connection.closed) return;
      if (!connection.isAlive) {
        sendClose(connection, 1011, "ping_timeout");
        closeConnection(connection);
        return;
      }
      connection.isAlive = false;
      sendFrame(connection, 0x9, Buffer.from("ping", "utf8"));
    });
  });
}, PING_INTERVAL_MS);
pingTimer.unref?.();

server.listen(PORT, HOST, () => {
  logEvent("listening", {
    wsUrl: `ws://${HOST}:${PORT}`,
    healthUrl: `http://${HOST}:${PORT}/healthz`,
    rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
    rateLimitMax: RATE_LIMIT_MAX,
    authTsSkewMs: AUTH_TS_SKEW_MS,
  });
});
