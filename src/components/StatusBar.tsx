import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/tokens";

export function StatusBar() {
  return (
    <View style={styles.statusBar}>
      <Text style={styles.statusText}>9:41</Text>
      <View style={styles.statusRight}>
        <Text style={styles.statusText}>||||</Text>
        <Text style={styles.statusText}>87%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBar: {
    height: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#151515",
    backgroundColor: COLORS.bg0,
  },
  statusText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  statusRight: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
});
