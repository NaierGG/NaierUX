const state = {
  route: "Direct P2P",
  disappearPolicy: "5 min",
  accent: "#00FF88",
  queueInFlight: 0,
  call: {
    phase: "idle",
    mode: "voice",
    route: "Direct P2P",
    encrypted: true,
    muted: false,
    cameraEnabled: true,
    speakerEnabled: true,
    bars: 5,
    latency: 48,
    jitter: 0,
    loss: 0,
    durationSec: 0,
  },
  chats: [
    {
      id: "chat-astra",
      name: "Astra",
      preview: "Route switched to direct P2P.",
      time: "09:32",
      route: "Direct P2P",
      unread: 2,
      active: true,
    },
    {
      id: "chat-node11",
      name: "Node-11",
      preview: "Fingerprint verified in person.",
      time: "08:55",
      route: "2-hop Relay",
      unread: 0,
      active: false,
    },
    {
      id: "chat-ops",
      name: "Ops Mesh",
      preview: "New disappearing policy: 24h",
      time: "Yesterday",
      route: "Tor",
      unread: 6,
      active: false,
    },
  ],
  messages: [
    {
      id: "m-1",
      text: "Handshake complete. Route is onion relay.",
      fromMe: false,
      meta: "09:21 | sent",
    },
    {
      id: "m-2",
      text: "Set timer to 5 minutes for this thread.",
      fromMe: true,
      meta: "09:22 | sent",
    },
    {
      id: "m-3",
      text: "Received. Anti-delete lock is enabled.",
      fromMe: false,
      meta: "09:23 | sent",
    },
  ],
};

let callTickTimer = null;

const ROUTE_META = {
  "Direct P2P": { bars: 5, latency: 48, label: "Low latency, peer direct" },
  "2-hop Relay": { bars: 4, latency: 67, label: "Balanced privacy and reliability" },
  Tor: { bars: 3, latency: 94, label: "Maximum route privacy" },
};

function routeColor(route) {
  if (route === "Direct P2P") return "#39FF14";
  if (route === "2-hop Relay") return "#00D4FF";
  return "#FF2E63";
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

function updateThemeAccent() {
  document.documentElement.style.setProperty("--accent", state.accent);
}

function renderChats() {
  const chatList = document.getElementById("chatList");
  chatList.innerHTML = "";
  state.chats.forEach((chat) => {
    const badgeColor = routeColor(chat.route);
    const badgeLabel = chat.route === "Direct P2P" ? "P2P" : chat.route === "2-hop Relay" ? "RELAY" : "TOR";
    const row = document.createElement("button");
    row.className = `chat-item ${chat.active ? "active" : ""}`;
    row.type = "button";
    row.innerHTML = `
      <div class="avatar">${chat.name[0]}</div>
      <div class="meta">
        <strong>${chat.name}</strong>
        <p>${chat.preview}</p>
      </div>
      <div class="right">
        <span class="route-badge" style="border-color:${badgeColor}; color:${badgeColor}">${badgeLabel}</span>
        <small>${chat.time}</small>
        ${chat.unread > 0 ? `<span class="badge">${chat.unread}</span>` : ""}
      </div>
    `;
    row.addEventListener("click", () => {
      state.chats = state.chats.map((item) => ({ ...item, active: item.id === chat.id }));
      renderChats();
    });
    chatList.appendChild(row);
  });
}

function renderMessages() {
  const messageList = document.getElementById("messageList");
  messageList.innerHTML = "";
  state.messages.forEach((msg) => {
    const bubble = document.createElement("div");
    bubble.className = `msg ${msg.fromMe ? "me" : "peer"}`;
    bubble.innerHTML = `<p>${msg.text}</p><small>${msg.meta}</small>`;
    messageList.appendChild(bubble);
  });
  messageList.scrollTop = messageList.scrollHeight;
}

function renderRoute() {
  const routeLabel = document.getElementById("routeLabel");
  const routeMeta = document.getElementById("routeMeta");
  const routePolicy = document.getElementById("routePolicy");
  const roomSub = document.getElementById("roomSub");
  const queueState = document.getElementById("queueState");
  const strip = document.getElementById("routeStrip");

  const meta = ROUTE_META[state.route];
  const color = routeColor(state.route);

  routeLabel.textContent = state.route;
  routeMeta.textContent = `${meta.label} | ${meta.latency}ms | bars ${meta.bars}/5`;
  roomSub.textContent = `${state.route} | ${meta.latency}ms`;
  routePolicy.textContent = state.route;
  queueState.textContent = `Queue in-flight: ${state.queueInFlight}`;
  strip.style.borderColor = color;
  strip.style.boxShadow = `0 0 20px ${color}33`;

  document.querySelectorAll("[data-route]").forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.route === state.route);
  });
}

function renderCallState() {
  const phase = document.getElementById("callPhase");
  const meta = document.getElementById("callMeta");
  const strip = document.getElementById("callStrip");
  const color = routeColor(state.call.route);

  phase.textContent = `${state.call.phase.toUpperCase()} | ${state.call.mode.toUpperCase()}`;
  meta.textContent =
    `${state.call.route} | ${state.call.latency}ms | bars ${state.call.bars}/5 | ` +
    `jitter ${state.call.jitter}ms | loss ${state.call.loss.toFixed(1)}% | ` +
    `duration ${formatDuration(state.call.durationSec)}`;
  strip.style.borderColor = color;
  strip.style.boxShadow = `0 0 18px ${color}2B`;

  const mute = document.getElementById("callMute");
  const camera = document.getElementById("callCamera");
  const speaker = document.getElementById("callSpeaker");
  mute.textContent = state.call.muted ? "Unmute" : "Mute";
  camera.textContent = state.call.cameraEnabled ? "Camera On" : "Camera Off";
  speaker.textContent = state.call.speakerEnabled ? "Speaker On" : "Speaker Off";
}

function renderPolicy() {
  document.querySelectorAll("[data-policy]").forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.policy === state.disappearPolicy);
  });
}

function bindRouteControls() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      state.route = button.dataset.route;
      syncCallRoute(state.route);
      renderRoute();
      renderCallState();
    });
  });
}

function bindPolicyControls() {
  document.querySelectorAll("[data-policy]").forEach((button) => {
    button.addEventListener("click", () => {
      state.disappearPolicy = button.dataset.policy;
      renderPolicy();
    });
  });
}

function bindAccentControls() {
  document.querySelectorAll(".swatch").forEach((button) => {
    button.addEventListener("click", () => {
      state.accent = button.dataset.accent;
      document.querySelectorAll(".swatch").forEach((swatch) => swatch.classList.remove("active"));
      button.classList.add("active");
      updateThemeAccent();
    });
  });
}

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

function syncCallRoute(route) {
  state.call.route = route;
  state.call.bars = ROUTE_META[route].bars;
  state.call.latency = ROUTE_META[route].latency;
  state.call.jitter = route === "Direct P2P" ? 4 : route === "2-hop Relay" ? 7 : 11;
  state.call.loss = route === "Direct P2P" ? 0.4 : route === "2-hop Relay" ? 0.9 : 1.4;
}

function startCall(mode) {
  if (callTickTimer) {
    clearInterval(callTickTimer);
    callTickTimer = null;
  }

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
  }, 600);
}

function endCall() {
  if (callTickTimer) {
    clearInterval(callTickTimer);
    callTickTimer = null;
  }
  state.call.phase = "ended";
  renderCallState();
}

function bindCallControls() {
  document.getElementById("callQuickStart").addEventListener("click", () => startCall("voice"));
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
    renderRoute();
    renderCallState();
  });
}

function bindComposer() {
  const form = document.getElementById("composer");
  const draft = document.getElementById("draft");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = draft.value.trim();
    if (!value) return;

    const optimisticId = `local-${Date.now()}`;
    state.messages.push({
      id: optimisticId,
      text: value,
      fromMe: true,
      meta: `now | sending | expire ${state.disappearPolicy}`,
    });
    state.queueInFlight += 1;
    renderMessages();
    renderRoute();
    draft.value = "";

    setTimeout(() => {
      let success = deliveryOutcome(state.route);
      if (!success) {
        const next = fallbackRoute(state.route);
        state.route = next;
        syncCallRoute(state.route);
        success = deliveryOutcome(next);
      }

      state.messages = state.messages.map((msg) =>
        msg.id === optimisticId
          ? {
              ...msg,
              meta:
                `now | ${success ? "sent" : "failed"} | ${state.route} | ` +
                `AES-256-GCM/HKDF-SHA256/HMAC-SHA256 | expire ${state.disappearPolicy}`,
            }
          : msg,
      );
      state.queueInFlight = Math.max(0, state.queueInFlight - 1);
      renderMessages();
      renderRoute();
      renderCallState();
    }, ROUTE_META[state.route].latency + 120);
  });
}

function init() {
  syncCallRoute(state.route);
  renderChats();
  renderMessages();
  renderRoute();
  renderCallState();
  renderPolicy();
  updateThemeAccent();
  bindRouteControls();
  bindPolicyControls();
  bindAccentControls();
  bindCallControls();
  bindComposer();
}

init();
