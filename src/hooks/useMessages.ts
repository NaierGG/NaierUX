import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ChatMessage, DisappearPolicy, RouteMode } from "../core";
import { CHAT_MESSAGES } from "../state/mockData";

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
};

export type SendDraftInput = {
  chatId: string;
  peerId: string;
};

export type UseMessagesResult = {
  messages: ChatMessage[];
  sendDraft: (input: SendDraftInput) => Promise<void>;
  draft: string;
  setDraft: (value: string) => void;
  sending: boolean;
};

export function useMessages({
  route,
  disappearPolicy,
  sendMessage,
  cryptoScheme,
  messages,
  setMessages,
}: UseMessagesOptions): UseMessagesResult {
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>(CHAT_MESSAGES);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

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
      } catch {
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
    [cryptoScheme, disappearPolicy, draft, effectiveSetMessages, route, sendMessage, sending],
  );

  return {
    messages: effectiveMessages,
    sendDraft,
    draft,
    setDraft,
    sending,
  };
}
