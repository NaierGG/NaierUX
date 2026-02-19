import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
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
        <Text style={styles.body}>Local encrypted backup: Ready</Text>
        <Text style={styles.body}>Recovery phrase re-check: Pending</Text>
        <Text style={styles.warning}>Avoid cloud destinations that expose metadata.</Text>
      </Card>
      <Card accent={COLORS.accentAlert}>
        <Text style={styles.body}>Export includes encrypted history + contact fingerprints.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  body: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  warning: {
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
