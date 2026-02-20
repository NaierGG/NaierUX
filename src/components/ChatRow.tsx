import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/tokens";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";

type ChatRowProps = {
  name: string;
  preview: string;
  timeLabel: string;
  unread: number;
  online?: boolean;
  active?: boolean;
  onPress: () => void;
};

export function ChatRow({
  name,
  preview,
  timeLabel,
  unread,
  online,
  active = false,
  onPress,
}: ChatRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        active
          ? {
            borderColor: COLORS.glassBorderHover,
            backgroundColor: COLORS.glassHover,
          }
          : null,
      ]}
    >
      <Avatar label={name} size={44} borderColor={COLORS.glassBorderHover} online={online ?? false} />
      <View style={styles.meta}>
        <Text style={styles.name}>{name}</Text>
        <Text numberOfLines={1} style={styles.preview}>
          {preview}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.time}>{timeLabel}</Text>
        {unread > 0 ? <Badge label={unread} backgroundColor={COLORS.accentMain} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 3,
  },
  preview: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 6,
  },
  time: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
