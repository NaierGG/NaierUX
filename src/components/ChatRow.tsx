import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RouteMode } from "../core";
import { COLORS, glow, routeColor, routeDimColor } from "../theme/tokens";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";

type ChatRowProps = {
  name: string;
  preview: string;
  timeLabel: string;
  unread: number;
  route: RouteMode;
  accent: string;
  active?: boolean;
  onPress: () => void;
};

function routeBadgeLabel(route: RouteMode): string {
  if (route === "Direct P2P") return "P2P";
  if (route === "2-hop Relay") return "RELAY";
  return "TOR";
}

export function ChatRow({
  name,
  preview,
  timeLabel,
  unread,
  route,
  accent,
  active = false,
  onPress,
}: ChatRowProps) {
  const rColor = routeColor(route);
  const rDim = routeDimColor(route);

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
      <Avatar label={name} size={44} borderColor={COLORS.glassBorderHover} online={unread > 0} />
      <View style={styles.meta}>
        <Text style={styles.name}>{name}</Text>
        <Text numberOfLines={1} style={styles.preview}>
          {preview}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.routeBadge, { borderColor: glow(rColor, 0.3), backgroundColor: rDim }]}>
          <Text style={[styles.routeBadgeText, { color: rColor }]}>{routeBadgeLabel(route)}</Text>
        </View>
        <Text style={styles.time}>{timeLabel}</Text>
        {unread > 0 ? <Badge label={unread} backgroundColor={accent} /> : null}
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
  routeBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  routeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  time: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
