import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ChatMessage } from "../core";
import { COLORS } from "../theme/tokens";

type MessageBubbleProps = {
  message: ChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
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
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "78%",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.myBubble,
    borderColor: COLORS.accentCyber,
    shadowColor: "rgba(0,212,255,0.3)",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  peerBubble: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.peerBubble,
    borderColor: "#222222",
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 5,
  },
});
