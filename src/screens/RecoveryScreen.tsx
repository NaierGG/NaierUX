import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { COLORS, glow } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";

export type RecoveryScreenProps = NativeStackScreenProps<RootStackParamList, "Recovery"> & {
  accent: string;
  recoveryWords: string[];
  phraseValid: boolean;
  identityReady: boolean;
  onRestoreIdentity: (phraseInput: string) => Promise<{ ok: boolean; error?: string }>;
};

export function RecoveryScreen({
  navigation,
  accent,
  recoveryWords,
  phraseValid,
  identityReady,
  onRestoreIdentity,
}: RecoveryScreenProps) {
  const [restoreInput, setRestoreInput] = useState("");
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

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
              <Text style={styles.wordIndex}>{idx + 1}</Text>
              <Text style={styles.wordChipText}>{word}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card accent={accent}>
        <Text style={styles.body}>Restore identity from an existing 12/24 word phrase.</Text>
        <TextInput
          multiline
          value={restoreInput}
          onChangeText={setRestoreInput}
          placeholder="word1 word2 ... word12"
          placeholderTextColor={COLORS.textMuted}
          style={styles.restoreInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {restoreError ? <Text style={styles.errorText}>{restoreError}</Text> : null}
        {restoreSuccess ? <Text style={styles.successText}>{restoreSuccess}</Text> : null}
        <Pressable
          disabled={!restoreInput.trim() || restoring}
          onPress={async () => {
            if (!restoreInput.trim()) {
              return;
            }
            setRestoring(true);
            setRestoreError(null);
            setRestoreSuccess(null);
            const result = await onRestoreIdentity(restoreInput);
            if (result.ok) {
              setRestoreSuccess("Identity restored. Return to Home.");
              setRestoreInput("");
            } else {
              setRestoreError(result.error ?? "Restore failed.");
            }
            setRestoring(false);
          }}
          style={[
            styles.secondaryButton,
            { borderColor: glow(accent, 0.45), backgroundColor: glow(accent, 0.08) },
            (!restoreInput.trim() || restoring) ? styles.disabledButton : null,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: accent }]}>
            {restoring ? "Restoring..." : "Restore From Phrase"}
          </Text>
        </Pressable>
      </Card>

      <Pressable
        disabled={!identityReady}
        onPress={() => navigation.navigate("Home")}
        style={[
          styles.primaryButton,
          { borderColor: accent },
          !identityReady ? styles.disabledButton : null,
        ]}
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
    marginBottom: 10,
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
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
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
  restoreInput: {
    minHeight: 84,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.inputBg,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 10,
    textAlignVertical: "top",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginBottom: 8,
  },
  successText: {
    color: COLORS.success,
    fontSize: 12,
    marginBottom: 8,
  },
});
