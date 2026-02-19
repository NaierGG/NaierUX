import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { RouteMode, RouteStatus } from "../core";
import { COLORS, routeColor, routeDimColor } from "../theme/tokens";
import { Pill } from "./Pill";

type RouteStripProps = {
  route: RouteMode;
  routeStatus: RouteStatus;
  onSelectRoute?: (route: RouteMode) => void;
};

export function RouteStrip({ route, routeStatus, onSelectRoute }: RouteStripProps) {
  const color = routeColor(route);

  return (
    <View style={[styles.strip, { borderColor: routeDimColor(route) }]}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.routeLabel, { color }]}>{route}</Text>
      </View>
      <Text style={styles.routeMeta}>
        {routeStatus.label} • {routeStatus.latencyMs}ms • bars {routeStatus.bars}/5
      </Text>
      <View style={styles.routeButtons}>
        <Pill
          label="Direct P2P"
          color={routeColor("Direct P2P")}
          active={route === "Direct P2P"}
          onPress={() => onSelectRoute?.("Direct P2P")}
        />
        <Pill
          label="2-hop Relay"
          color={routeColor("2-hop Relay")}
          active={route === "2-hop Relay"}
          onPress={() => onSelectRoute?.("2-hop Relay")}
        />
        <Pill
          label="Tor"
          color={routeColor("Tor")}
          active={route === "Tor"}
          onPress={() => onSelectRoute?.("Tor")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    backgroundColor: COLORS.glass,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  routeLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  routeMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 10,
  },
  routeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
