import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { COLORS } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";

export type RecoveryScreenProps = NativeStackScreenProps<RootStackParamList, "Recovery"> & {
  accent: string;
  recoveryWords: string[];
  phraseValid: boolean;
};

export function RecoveryScreen({
  navigation,
  accent,
  recoveryWords,
  phraseValid,
}: RecoveryScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader
        title="Recovery Phrase"
        subtitle={`${recoveryWords.length}-word seed | ${phraseValid ? "valid" : "invalid"}`}
      />
      <Card>
        <Text style={styles.warning}>🔒 Never screenshot or cloud-sync your phrase.</Text>
        <View style={styles.chipGrid}>
          {recoveryWords.map((word, idx) => (
            <View key={`${word}-${idx}`} style={styles.wordChip}>
              <Text style={styles.wordIndex}>{idx + 1}</Text>
              <Text style={styles.wordChipText}>{word}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card accent={accent}>
        <Text style={styles.body}>Verification: confirm words #3, #7, #11 to proceed.</Text>
      </Card>
      <Pressable
        onPress={() => navigation.navigate("Home")}
        style={[styles.primaryButton, { borderColor: accent }]}
      >
        <Text style={[styles.primaryButtonText, { color: accent }]}>Continue to Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  body: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  warning: {
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  primaryButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 255, 136, 0.06)",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  wordChip: {
    width: "30%",
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: COLORS.bgElevated,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  wordIndex: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  wordChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});
