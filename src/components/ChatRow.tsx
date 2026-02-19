import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RouteMode } from "../core";
import { COLORS, glow, routeColor } from "../theme/tokens";
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
  const routeBadgeColor = routeColor(route);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        active
          ? {
              borderColor: accent,
              shadowColor: glow(accent),
              shadowOpacity: 0.45,
            }
          : null,
      ]}
    >
      <Avatar label={name} size={44} borderColor={COLORS.accentCyber} />
      <View style={styles.meta}>
        <Text style={styles.name}>{name}</Text>
        <Text numberOfLines={1} style={styles.preview}>
          {preview}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.routeBadge, { borderColor: routeBadgeColor }]}>
          <Text style={[styles.routeBadgeText, { color: routeBadgeColor }]}>{routeBadgeLabel(route)}</Text>
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
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  preview: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 6,
  },
  routeBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  routeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  time: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
});
