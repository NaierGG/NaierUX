/* ═══════════════════════════════════════════
   Naier Mesh — App Logic
   ═══════════════════════════════════════════ */

const STORAGE_KEY = "naier-web-state-v5";

const ROUTE_META = {
  "Direct P2P": { bars: 5, latency: 44, label: "Low latency, peer direct" },
  "2-hop Relay": { bars: 4, latency: 66, label: "Balanced privacy & reliability" },
  Tor: { bars: 3, latency: 92, label: "Maximum route privacy" },
};

const DEFAULT_STATE = {
  route: "Direct P2P",
  disappearPolicy: "5 min",
  accent: "#00FF88",
  queueInFlight: 0,
  activeChatId: null,
  call: {
    phase: "idle",
    mode: "voice",
    route: "Direct P2P",
    encrypted: true,
    muted: false,
    cameraEnabled: true,
    speakerEnabled: true,
    bars: 5,
    latency: 44,
    jitter: 0,
    loss: 0,
    durationSec: 0,
  },
  chats: [],
  contacts: [],
};

let state = loadState();
let callTickTimer = null;
let replyTimerPool = [];

/* ── Helpers ── */

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.chats) || !Array.isArray(parsed.contacts)) return cloneDefaultState();
    return { ...cloneDefaultState(), ...parsed };
  } catch {
    return cloneDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function routeColor(route) {
  if (route === "Direct P2P") return "#00FF88";
  if (route === "2-hop Relay") return "#00D4FF";
  return "#FF4B6E";
}

function nextRoute(route) {
  if (route === "Direct P2P") return "2-hop Relay";
  if (route === "2-hop Relay") return "Tor";
  return "Direct P2P";
}

function formatDuration(sec) {
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function timeLabelNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function normalizePeerId(peerIdInput) {
  const compact = String(peerIdInput || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!compact) return "";
  return compact.startsWith("peer-") ? compact : `peer-${compact}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function chatIdFromPeerId(peerId) {
  const value = normalizePeerId(peerId).replace(/^peer-/, "");
  return `chat-${value || "unknown"}`;
}

function activeChat() {
  return state.chats.find((c) => c.id === state.activeChatId) || state.chats[0] || null;
}

function trustLabel(trust) {
  if (trust === "verified") return "Verified";
  if (trust === "changed_key") return "Key Changed ⚠";
  return "Unverified";
}

function trustColor(trust) {
  if (trust === "verified") return "#00FF88";
  if (trust === "changed_key") return "#FF4B6E";
  return "#00D4FF";
}

function routeBadgeClass(route) {
  if (route === "Direct P2P") return "badge-p2p";
  if (route === "2-hop Relay") return "badge-relay";
  return "badge-tor";
}

function routeBadgeLabel(route) {
  if (route === "Direct P2P") return "P2P";
  if (route === "2-hop Relay") return "RELAY";
  return "TOR";
}

function isMobile() {
  return window.innerWidth <= 768;
}

/* ── Theme ── */

function updateThemeAccent() {
  document.documentElement.style.setProperty("--accent", state.accent);
  document.documentElement.style.setProperty("--accent-dim", state.accent + "18");
  document.documentElement.style.setProperty("--accent-glow", state.accent + "40");
}

/* ── Mobile View Toggle ── */

function openChatView() {
  document.getElementById("layout").classList.add("chat-open");
}

function closeChatView() {
  document.getElementById("layout").classList.remove("chat-open");
}

/* ── Render Chats ── */

function sortChatsByRecency() {
  state.chats.sort((a, b) => {
    if (a.id === state.activeChatId) return -1;
    if (b.id === state.activeChatId) return 1;
    return 0;
  });
}

function renderChats() {
  const chatList = document.getElementById("chatList");
  const query = String(document.getElementById("chatSearch")?.value || "").trim().toLowerCase();
  chatList.innerHTML = "";

  sortChatsByRecency();
  const filtered = state.chats.filter(
    (chat) =>
      !query ||
      chat.name.toLowerCase().includes(query) ||
      chat.preview.toLowerCase().includes(query),
  );

  if (filtered.length === 0) {
    chatList.innerHTML = `
      <div style="padding:32px 16px;text-align:center;color:var(--text-muted);font-size:13px;">
        No threads match your search.
      </div>`;
    return;
  }

  filtered.forEach((chat) => {
    const row = document.createElement("button");
    row.className = `chat-item ${chat.id === state.activeChatId ? "active" : ""}`;
    row.type = "button";
    row.innerHTML = `
      <div class="avatar${chat.trust === 'verified' ? ' online' : ''}">${chat.name.slice(0, 1).toUpperCase()}</div>
      <div class="chat-meta">
        <div class="chat-name">${escapeHtml(chat.name)}</div>
        <div class="chat-preview">${escapeHtml(chat.preview)}</div>
      </div>
      <div class="chat-right">
        <span class="chat-time">${escapeHtml(chat.time)}</span>
        <span class="route-badge ${routeBadgeClass(chat.route)}">${routeBadgeLabel(chat.route)}</span>
        ${chat.unread > 0 ? `<span class="unread-badge">${chat.unread}</span>` : ""}
      </div>
    `;
    row.addEventListener("click", () => {
      state.activeChatId = chat.id;
      chat.unread = 0;
      renderAll();
      saveState();
      if (isMobile()) openChatView();
    });
    chatList.appendChild(row);
  });
}

/* ── Render Chat Header & Meta ── */

function renderRoomMeta() {
  const current = activeChat();
  const dot = document.getElementById("headerRouteDot");
  dot.style.background = routeColor(state.route);

  const trustBadge = document.getElementById("trustBadge");
  document.getElementById("queueState").textContent = `Queue: ${state.queueInFlight}`;

  if (!current) {
    document.getElementById("roomTitle").textContent = "No Active Chat";
    document.getElementById("roomSub").textContent = `${state.route} | waiting for peer`;
    document.getElementById("headerAvatar").textContent = "?";
    trustBadge.textContent = "No Peer";
    trustBadge.style.color = "#00D4FF";
    return;
  }

  const routeInfo = ROUTE_META[state.route];
  document.getElementById("roomTitle").textContent = current.name;
  document.getElementById("roomSub").textContent = `${state.route} • ${routeInfo.latency}ms`;
  document.getElementById("headerAvatar").textContent = current.name.slice(0, 1).toUpperCase();
  trustBadge.textContent = trustLabel(current.trust);
  trustBadge.style.color = trustColor(current.trust);
}

/* ── Render Messages ── */

function renderMessages() {
  const messageList = document.getElementById("messageList");
  const current = activeChat();
  messageList.innerHTML = "";

  if (!current || current.messages.length === 0) {
    messageList.innerHTML = `
      <div class="empty-chat">
        <div class="empty-icon">🔐</div>
        <p>No chats yet.<br/>Add a friend with their peer ID.</p>
      </div>`;
    return;
  }

  current.messages.forEach((msg) => {
    const bubble = document.createElement("div");
    bubble.className = `msg ${msg.fromMe ? "me" : "peer"}`;
    bubble.innerHTML = `<p>${escapeHtml(msg.text)}</p><span class="msg-time">${escapeHtml(msg.meta)}</span>`;
    messageList.appendChild(bubble);
  });

  // Typing indicator
  const typing = document.createElement("div");
  typing.className = "typing-indicator";
  typing.id = "typingIndicator";
  typing.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
  messageList.appendChild(typing);

  messageList.scrollTop = messageList.scrollHeight;
}

/* ── Render Route Tabs ── */

function renderRoute() {
  const routePolicy = document.getElementById("routePolicy");
  if (routePolicy) routePolicy.textContent = state.route;

  document.querySelectorAll("[data-route]").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.route === state.route);
  });
}

/* ── Render Policy ── */

function renderPolicy() {
  document.querySelectorAll("[data-policy]").forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.policy === state.disappearPolicy);
  });
}

/* ── Render Quick Contacts ── */

function renderQuickContacts() {
  const container = document.getElementById("contactQuickList");
  if (!container) return;
  container.innerHTML = "";

  state.contacts.slice(0, 6).forEach((contact) => {
    const row = document.createElement("div");
    row.className = "quick-contact";
    row.innerHTML = `
      <div class="avatar" style="width:30px;height:30px;font-size:12px;border-width:1px;">${contact.name.slice(0, 1).toUpperCase()}</div>
      <div class="qc-meta">
        <div class="qc-name">${escapeHtml(contact.name)}</div>
        <div class="qc-id">${escapeHtml(contact.peerId)}</div>
      </div>
      <button class="qc-btn" type="button" data-open-peer="${contact.peerId}">Open</button>
    `;
    container.appendChild(row);
  });
}

/* ── Render Clock ── */

function renderClock() {
  const clock = document.getElementById("clock");
  if (!clock) return;
  clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ── Call State ── */

function syncCallRoute(route) {
  state.call.route = route;
  state.call.bars = ROUTE_META[route].bars;
  state.call.latency = ROUTE_META[route].latency;
  state.call.jitter = route === "Direct P2P" ? 4 : route === "2-hop Relay" ? 7 : 12;
  state.call.loss = route === "Direct P2P" ? 0.4 : route === "2-hop Relay" ? 0.9 : 1.4;
}

function renderCallState() {
  const overlay = document.getElementById("callOverlay");
  const current = activeChat();

  if (state.call.phase === "idle" || state.call.phase === "ended") {
    overlay.classList.remove("visible");
    return;
  }

  overlay.classList.add("visible");

  const color = routeColor(state.call.route);
  document.getElementById("callAvatar").textContent = current ? current.name.slice(0, 1).toUpperCase() : "?";
  document.getElementById("callAvatar").style.borderColor = color;
  document.getElementById("callPeer").textContent = current ? current.name : "Unknown";

  const phaseLabel = state.call.phase === "connecting" ? "Connecting..." : `${state.call.mode.toUpperCase()} • ${formatDuration(state.call.durationSec)}`;
  document.getElementById("callStatus").textContent = phaseLabel;
  document.getElementById("callQuality").textContent =
    `${state.call.route} • ${state.call.latency}ms • bars ${state.call.bars}/5 • jitter ${state.call.jitter}ms • loss ${state.call.loss.toFixed(1)}%`;

  document.getElementById("callMute").classList.toggle("active", state.call.muted);
  document.getElementById("callCamera").classList.toggle("active", !state.call.cameraEnabled);
  document.getElementById("callSpeaker").classList.toggle("active", !state.call.speakerEnabled);
}

/* ── Render All ── */

function renderAll() {
  renderChats();
  renderRoomMeta();
  renderMessages();
  renderRoute();
  renderPolicy();
  renderQuickContacts();
  renderCallState();
}

/* ═══════════════════════════════════════
   EVENT BINDINGS
   ═══════════════════════════════════════ */

function bindRouteControls() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      state.route = button.dataset.route;
      syncCallRoute(state.route);
      renderAll();
      saveState();
    });
  });
}

function bindPolicyControls() {
  document.querySelectorAll("[data-policy]").forEach((button) => {
    button.addEventListener("click", () => {
      state.disappearPolicy = button.dataset.policy;
      renderPolicy();
      saveState();
    });
  });
}

function bindAccentControls() {
  document.querySelectorAll(".swatch").forEach((button) => {
    button.addEventListener("click", () => {
      state.accent = button.dataset.accent;
      document.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
      button.classList.add("active");
      updateThemeAccent();
      renderAll();
      saveState();
    });
  });
}

function bindSearch() {
  const search = document.getElementById("chatSearch");
  search.addEventListener("input", () => renderChats());
}

/* ── Call Controls ── */

function startCall(mode) {
  if (callTickTimer) { clearInterval(callTickTimer); callTickTimer = null; }
  state.call.phase = "connecting";
  state.call.mode = mode;
  syncCallRoute(state.route);
  renderCallState();

  setTimeout(() => {
    state.call.phase = "connected";
    state.call.durationSec = 0;
    renderCallState();
    callTickTimer = setInterval(() => {
      state.call.durationSec += 1;
      syncCallRoute(state.call.route);
      renderCallState();
    }, 1000);
  }, 800);
}

function endCall() {
  if (callTickTimer) { clearInterval(callTickTimer); callTickTimer = null; }
  state.call.phase = "ended";
  renderCallState();
  setTimeout(() => { state.call.phase = "idle"; renderCallState(); }, 300);
}

function bindCallControls() {
  document.getElementById("callQuickStart").addEventListener("click", () => startCall("voice"));
  document.getElementById("videoQuickStart").addEventListener("click", () => startCall("video"));
  document.getElementById("callVoice").addEventListener("click", () => startCall("voice"));
  document.getElementById("callVideo").addEventListener("click", () => startCall("video"));
  document.getElementById("callEnd").addEventListener("click", endCall);
  document.getElementById("callMute").addEventListener("click", () => {
    state.call.muted = !state.call.muted;
    renderCallState();
  });
  document.getElementById("callCamera").addEventListener("click", () => {
    state.call.cameraEnabled = !state.call.cameraEnabled;
    renderCallState();
  });
  document.getElementById("callSpeaker").addEventListener("click", () => {
    state.call.speakerEnabled = !state.call.speakerEnabled;
    renderCallState();
  });
  document.getElementById("callRoute").addEventListener("click", () => {
    state.route = nextRoute(state.route);
    syncCallRoute(state.route);
    renderAll();
    saveState();
  });
}

/* ── Messaging ── */

function deliveryOutcome(route) {
  if (route === "Direct P2P") return Math.random() < 0.9;
  if (route === "2-hop Relay") return Math.random() < 0.96;
  return Math.random() < 0.93;
}

function fallbackRoute(route) {
  if (route === "Direct P2P") return "2-hop Relay";
  if (route === "2-hop Relay") return "Tor";
  return "2-hop Relay";
}

function showTypingIndicator() {
  const el = document.getElementById("typingIndicator");
  if (el) el.classList.add("visible");
}

function hideTypingIndicator() {
  const el = document.getElementById("typingIndicator");
  if (el) el.classList.remove("visible");
}

function pushPeerReply(chat, sourceText, routeUsed) {
  const responseSet = [
    "Route verified. Remote key continuity intact.",
    "Ack. Relay telemetry stable on this hop chain.",
    "Packet integrity passed. Continue secure exchange.",
    "Copy. Mesh routing confirmed, no anomaly detected.",
  ];
  const replyText =
    /hello|hi|안녕/i.test(sourceText)
      ? "Handshake accepted. Encrypted channel confirmed."
      : responseSet[Math.floor(Math.random() * responseSet.length)];

  showTypingIndicator();

  const timer = setTimeout(() => {
    hideTypingIndicator();
    chat.messages.push({
      id: `peer-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      text: replyText,
      fromMe: false,
      meta: `${timeLabelNow()} | sent | ${routeUsed}`,
    });
    chat.preview = replyText;
    chat.time = timeLabelNow();
    if (state.activeChatId !== chat.id) {
      chat.unread += 1;
    }
    renderAll();
    saveState();
  }, 900 + Math.floor(Math.random() * 800));
  replyTimerPool.push(timer);
}

function bindComposer() {
  const form = document.getElementById("composer");
  const draft = document.getElementById("draft");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = draft.value.trim();
    if (!value) return;

    const chat = activeChat();
    if (!chat) return;

    const optimisticId = `local-${Date.now()}`;
    chat.messages.push({
      id: optimisticId,
      text: value,
      fromMe: true,
      meta: `now | sending | expire ${state.disappearPolicy}`,
    });
    chat.preview = value;
    chat.time = timeLabelNow();
    chat.unread = 0;
    state.queueInFlight += 1;
    draft.value = "";
    renderAll();
    saveState();

    setTimeout(() => {
      let routeUsed = state.route;
      let success = deliveryOutcome(routeUsed);
      if (!success) {
        routeUsed = fallbackRoute(routeUsed);
        state.route = routeUsed;
        syncCallRoute(routeUsed);
        success = deliveryOutcome(routeUsed);
      }

      chat.route = routeUsed;
      chat.messages = chat.messages.map((msg) =>
        msg.id === optimisticId
          ? {
            ...msg,
            meta:
              `${timeLabelNow()} | ${success ? "sent" : "failed"} | ${routeUsed} | ` +
              `AES-256-GCM / HKDF-SHA256 / HMAC | expire ${state.disappearPolicy}`,
          }
          : msg,
      );
      state.queueInFlight = Math.max(0, state.queueInFlight - 1);

      if (success) {
        pushPeerReply(chat, value, routeUsed);
      }

      renderAll();
      saveState();
    }, ROUTE_META[state.route].latency + 140);
  });
}

/* ── New Chat Modal ── */

function ensureContact(peerId, name, trust = "unverified") {
  if (state.contacts.some((c) => c.peerId === peerId)) return;
  state.contacts.push({ peerId, name, trust });
}

function createOrOpenChat(peerIdInput, nameInput) {
  const peerId = normalizePeerId(peerIdInput);
  if (!peerId) return;
  const displayName = String(nameInput || peerId.replace(/^peer-/, "")).trim();
  const chatId = chatIdFromPeerId(peerId);
  let chat = state.chats.find((item) => item.id === chatId);
  if (!chat) {
    chat = {
      id: chatId,
      peerId,
      name: displayName,
      preview: "Secure channel initialized.",
      time: timeLabelNow(),
      route: state.route,
      unread: 0,
      trust: "unverified",
      messages: [],
    };
    state.chats.unshift(chat);
  }
  ensureContact(peerId, displayName, chat.trust);
  state.activeChatId = chat.id;
  chat.unread = 0;
  renderAll();
  saveState();
  if (isMobile()) openChatView();
}

function bindNewChat() {
  const fab = document.getElementById("newChatFab");
  const modal = document.getElementById("newChatModal");
  const cancelBtn = document.getElementById("newChatCancel");
  const createBtn = document.getElementById("createChatBtn");
  const peerInput = document.getElementById("newPeerId");
  const nameInput = document.getElementById("newPeerName");

  fab.addEventListener("click", () => {
    modal.classList.add("visible");
    peerInput.focus();
  });

  cancelBtn.addEventListener("click", () => {
    modal.classList.remove("visible");
    peerInput.value = "";
    nameInput.value = "";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("visible");
      peerInput.value = "";
      nameInput.value = "";
    }
  });

  createBtn.addEventListener("click", () => {
    createOrOpenChat(peerInput.value, nameInput.value);
    peerInput.value = "";
    nameInput.value = "";
    modal.classList.remove("visible");
  });

  // Allow Enter to submit
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      createBtn.click();
    }
  });
}

/* ── Quick Contacts ── */

function bindQuickContacts() {
  document.getElementById("contactQuickList").addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const peerId = target.dataset.openPeer;
    if (!peerId) return;
    const contact = state.contacts.find((item) => item.peerId === peerId);
    createOrOpenChat(peerId, contact?.name || peerId);
  });
}

/* ── Mobile Back Button ── */

function bindBackButton() {
  document.getElementById("backBtn").addEventListener("click", () => {
    closeChatView();
  });
}

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */

function init() {
  syncCallRoute(state.route);
  updateThemeAccent();
  renderClock();
  renderAll();
  bindRouteControls();
  bindPolicyControls();
  bindAccentControls();
  bindSearch();
  bindCallControls();
  bindComposer();
  bindNewChat();
  bindQuickContacts();
  bindBackButton();
  setInterval(renderClock, 30000);
}

window.addEventListener("beforeunload", () => {
  if (callTickTimer) clearInterval(callTickTimer);
  replyTimerPool.forEach((timer) => clearTimeout(timer));
  replyTimerPool = [];
});

init();

