import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ChatMessage } from "../core";
import { COLORS } from "../theme/tokens";

type MessageBubbleProps = {
  message: ChatMessage;
  accent?: string;
  onRetry?: (messageId: string) => void;
};

export function MessageBubble({ message, accent = COLORS.accentMain, onRetry }: MessageBubbleProps) {
  const showRetry = message.fromMe && message.delivery === "failed" && Boolean(onRetry);

  return (
    <View
      style={[
        styles.bubble,
        message.fromMe ? styles.myBubble : styles.peerBubble,
      ]}
    >
      <Text style={styles.text}>{message.text}</Text>
      <Text style={styles.meta}>
        {message.sentAtLabel} | {message.delivery}
        {message.routeUsed ? ` | ${message.routeUsed}` : ""}
      </Text>
      {showRetry ? (
        <Pressable onPress={() => onRetry?.(message.id)} style={[styles.retryButton, { borderColor: accent }]}>
          <Text style={[styles.retryText, { color: accent }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
  },
  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.myBubble,
    borderColor: COLORS.myBubbleBorder,
    borderBottomRightRadius: 6,
  },
  peerBubble: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.peerBubble,
    borderColor: COLORS.peerBubbleBorder,
    borderBottomLeftRadius: 6,
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 5,
  },
  retryButton: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 6,
  },
  retryText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
