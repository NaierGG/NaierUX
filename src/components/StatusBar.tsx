import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/tokens";

export function StatusBar() {
  return (
    <View style={styles.statusBar}>
      <View style={styles.left}>
        <View style={styles.meshDot} />
        <Text style={styles.statusText}>Mesh Active</Text>
        <Text style={styles.sep}>•</Text>
        <Text style={styles.statusText}>9:41</Text>
      </View>
      <Text style={styles.statusText}>E2EE • AES-256-GCM</Text>
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
    backgroundColor: COLORS.accentMain,
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
