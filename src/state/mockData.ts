import type { ChatMessage, ChatPreview, DisappearPolicy, RouteMode } from "../core/types";

export const DEFAULT_ROUTE: RouteMode = "Direct P2P";
export const DEFAULT_POLICY: DisappearPolicy = "5 min";

export const CHAT_PREVIEWS: ChatPreview[] = [
  {
    id: "chat-astra",
    name: "Astra",
    lastMessage: "Route switched to direct P2P.",
    timeLabel: "09:32",
    unread: 2,
    trust: "verified",
  },
  {
    id: "chat-node11",
    name: "Node-11",
    lastMessage: "Fingerprint verified in person.",
    timeLabel: "08:55",
    unread: 0,
    trust: "unverified",
  },
  {
    id: "chat-ops",
    name: "Ops Mesh",
    lastMessage: "New disappearing policy: 24h",
    timeLabel: "Yesterday",
    unread: 6,
    trust: "verified",
  },
];

export const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    chatId: "chat-astra",
    text: "Handshake complete. Route is onion relay.",
    fromMe: false,
    sentAtLabel: "09:21",
    delivery: "sent",
  },
  {
    id: "msg-2",
    chatId: "chat-astra",
    text: "Set timer to 5 minutes for this thread.",
    fromMe: true,
    sentAtLabel: "09:22",
    delivery: "sent",
    expiresIn: "5 min",
  },
  {
    id: "msg-3",
    chatId: "chat-astra",
    text: "Received. Anti-delete lock is enabled.",
    fromMe: false,
    sentAtLabel: "09:23",
    delivery: "sent",
  },
];
