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
        <Text style={styles.warning}>Never screenshot or cloud-sync your phrase.</Text>
        <View style={styles.chipGrid}>
          {recoveryWords.map((word, idx) => (
            <View key={`${word}-${idx}`} style={styles.wordChip}>
              <Text style={styles.wordChipText}>
                {idx + 1}. {word}
              </Text>
            </View>
          ))}
        </View>
      </Card>
      <Card accent={accent}>
        <Text style={styles.body}>Verification challenge: confirm words #3, #7, #11.</Text>
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
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  body: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  warning: {
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  primaryButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  wordChip: {
    width: "31%",
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: COLORS.peerBubble,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#222222",
  },
  wordChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});
