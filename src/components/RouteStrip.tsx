import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { RouteMode, RouteStatus } from "../core";
import { COLORS, routeColor } from "../theme/tokens";
import { Card } from "./Card";
import { Pill } from "./Pill";

type RouteStripProps = {
  route: RouteMode;
  routeStatus: RouteStatus;
  onSelectRoute?: (route: RouteMode) => void;
};

export function RouteStrip({ route, routeStatus, onSelectRoute }: RouteStripProps) {
  const color = routeColor(route);

  return (
    <Card accent={color}>
      <Text style={[styles.routeLabel, { color }]}>{route}</Text>
      <Text style={styles.routeMeta}>
        {routeStatus.label} | {routeStatus.latencyMs}ms | bars {routeStatus.bars}/5
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
    </Card>
  );
}

const styles = StyleSheet.create({
  routeLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  routeMeta: {
    color: COLORS.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  routeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
});
