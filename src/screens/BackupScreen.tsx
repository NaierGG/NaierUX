import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { COLORS } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";

export type BackupScreenProps = NativeStackScreenProps<RootStackParamList, "Backup">;

export function BackupScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Backup & Export" subtitle="Air-gapped export recommended" />

      <Card>
        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusDot}>●</Text>
          <Text style={styles.body}>Local encrypted backup: Ready</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={[styles.statusDot, { color: COLORS.warn }]}>●</Text>
          <Text style={styles.body}>Recovery phrase re-check: Pending</Text>
        </View>
      </Card>

      <Card accent={COLORS.accentAlert}>
        <Text style={styles.warning}>
          ⚠ Avoid cloud destinations that expose metadata.
        </Text>
        <Text style={styles.body}>
          Export includes encrypted history + contact fingerprints.
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Export Format</Text>
        <Text style={styles.body}>Encrypted JSON • AES-256-GCM wrapped</Text>
        <Text style={styles.body}>Compatible with air-gapped restore</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  warning: {
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  statusDot: {
    color: COLORS.accentMain,
    fontSize: 8,
  },
});
