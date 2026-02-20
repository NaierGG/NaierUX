import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ChatMessage, DisappearPolicy, RouteMode } from "../core";

export type SendMessageFn = (input: {
  chatId: string;
  toPeerId: string;
  text: string;
  route: RouteMode;
  disappearPolicy?: DisappearPolicy;
}) => Promise<ChatMessage>;

type UseMessagesOptions = {
  route: RouteMode;
  disappearPolicy: DisappearPolicy;
  sendMessage: SendMessageFn;
  cryptoScheme: string;
  messages?: ChatMessage[];
  setMessages?: Dispatch<SetStateAction<ChatMessage[]>>;
  onThreadActivity?: (activity: { chatId: string; text: string; fromMe: boolean }) => void;
};

export type SendDraftInput = {
  chatId: string;
  peerId: string;
};

export type RetryMessageInput = {
  messageId: string;
  chatId: string;
  peerId: string;
};

export type UseMessagesResult = {
  messages: ChatMessage[];
  sendDraft: (input: SendDraftInput) => Promise<void>;
  retryMessage: (input: RetryMessageInput) => Promise<void>;
  draft: string;
  setDraft: (value: string) => void;
  sending: boolean;
  lastSendError: string | null;
};

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function useMessages({
  route,
  disappearPolicy,
  sendMessage,
  cryptoScheme,
  messages,
  setMessages,
  onThreadActivity,
}: UseMessagesOptions): UseMessagesResult {
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSendError, setLastSendError] = useState<string | null>(null);

  const controlled = Boolean(messages && setMessages);
  const effectiveMessages = useMemo(() => {
    if (controlled && messages) {
      return messages;
    }
    return internalMessages;
  }, [controlled, internalMessages, messages]);

  const effectiveSetMessages = useMemo(() => {
    if (controlled && setMessages) {
      return setMessages;
    }
    return setInternalMessages;
  }, [controlled, setMessages]);

  const sendDraft = useCallback(
    async ({ chatId, peerId }: SendDraftInput) => {
      const trimmed = draft.trim();
      if (!trimmed || sending) {
        return;
      }

      const optimisticId = `msg-local-${Date.now()}`;
      setLastSendError(null);
      const optimistic: ChatMessage = {
        id: optimisticId,
        chatId,
        text: trimmed,
        fromMe: true,
        sentAtLabel: "now",
        delivery: "sending",
        expiresIn: disappearPolicy,
      };

      effectiveSetMessages((prev) => [...prev, optimistic]);
      onThreadActivity?.({ chatId, text: trimmed, fromMe: true });
      setDraft("");
      setSending(true);

      try {
        const sent = await sendMessage({
          chatId,
          toPeerId: peerId,
          text: trimmed,
          route,
          disappearPolicy,
        });

        effectiveSetMessages((prev) =>
          prev.map((message) => (message.id === optimisticId ? sent : message)),
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Failed to send encrypted message.";
        if (reason.toLowerCase().includes("secure handshake")) {
          setLastSendError("Secure session is not ready yet. Wait for key exchange to complete, then retry.");
        } else {
          setLastSendError(reason);
        }
        effectiveSetMessages((prev) =>
          prev.map((message) =>
            message.id === optimisticId
              ? {
                  ...message,
                  delivery: "failed",
                  routeUsed: route,
                  cipherSuite: cryptoScheme,
                }
              : message,
          ),
        );
      } finally {
        setSending(false);
      }
    },
    [cryptoScheme, disappearPolicy, draft, effectiveSetMessages, onThreadActivity, route, sendMessage, sending],
  );

  const retryMessage = useCallback(
    async ({ messageId, chatId, peerId }: RetryMessageInput) => {
      const existing = effectiveMessages.find((message) => message.id === messageId);
      if (!existing || !existing.fromMe || existing.delivery !== "failed" || sending) {
        return;
      }

      setLastSendError(null);
      effectiveSetMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, delivery: "sending", sentAtLabel: "retrying" } : message,
        ),
      );

      setSending(true);
      try {
        const sent = await sendMessage({
          chatId,
          toPeerId: peerId,
          text: existing.text,
          route,
          disappearPolicy,
        });

        effectiveSetMessages((prev) =>
          prev.map((message) =>
            message.id === messageId
              ? {
                  ...sent,
                  id: message.id,
                  text: existing.text,
                }
              : message,
          ),
        );
        onThreadActivity?.({ chatId, text: existing.text, fromMe: true });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Failed to send encrypted message.";
        if (reason.toLowerCase().includes("secure handshake")) {
          setLastSendError("Secure session is not ready yet. Wait for key exchange to complete, then retry.");
        } else {
          setLastSendError(reason);
        }
        effectiveSetMessages((prev) =>
          prev.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  delivery: "failed",
                  routeUsed: route,
                  cipherSuite: cryptoScheme,
                  sentAtLabel: nowLabel(),
                }
              : message,
          ),
        );
      } finally {
        setSending(false);
      }
    },
    [
      cryptoScheme,
      disappearPolicy,
      effectiveMessages,
      effectiveSetMessages,
      onThreadActivity,
      route,
      sendMessage,
      sending,
    ],
  );

  return {
    messages: effectiveMessages,
    sendDraft,
    retryMessage,
    draft,
    setDraft,
    sending,
    lastSendError,
  };
}
