import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/tokens";

type StatusBarProps = {
  meshActive?: boolean;
  cipherLabel?: string;
};

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function StatusBar({ meshActive = false, cipherLabel }: StatusBarProps) {
  const meshLabel = meshActive ? "Mesh Active" : "Offline";
  const resolvedCipher = cipherLabel?.trim() ? cipherLabel : "Unknown";

  return (
    <View style={styles.statusBar}>
      <View style={styles.left}>
        <View style={[styles.meshDot, meshActive ? styles.meshDotOnline : styles.meshDotOffline]} />
        <Text style={styles.statusText}>{meshLabel}</Text>
        <Text style={styles.sep}>|</Text>
        <Text style={styles.statusText}>{nowLabel()}</Text>
      </View>
      <Text style={styles.statusText}>E2EE | {resolvedCipher}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBar: {
    height: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    backgroundColor: "rgba(5, 6, 10, 0.85)",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  meshDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  meshDotOnline: {
    backgroundColor: COLORS.success,
  },
  meshDotOffline: {
    backgroundColor: COLORS.danger,
  },
  statusText: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  sep: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
