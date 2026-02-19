import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { ACCENT_BY_MODE, COLORS, type AccentMode } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";
import { Pill } from "../components/Pill";

export type AppearanceScreenProps = NativeStackScreenProps<RootStackParamList, "Appearance"> & {
  accentMode: AccentMode;
  onSetAccentMode: (mode: AccentMode) => void;
  accent: string;
};

const MODES: AccentMode[] = ["Neon Green", "Neon Red", "Highlight Purple", "Cyber Blue"];

export function AppearanceScreen({ accentMode, onSetAccentMode, accent }: AppearanceScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Appearance" subtitle="Dark mode enabled (locked)" />

      <Card>
        <Text style={styles.sectionLabel}>Accent Color</Text>
        <View style={styles.swatchRow}>
          {MODES.map((mode) => (
            <Pill
              key={mode}
              label={mode}
              color={ACCENT_BY_MODE[mode]}
              active={accentMode === mode}
              onPress={() => onSetAccentMode(mode)}
            />
          ))}
        </View>
      </Card>

      <Card accent={accent}>
        <Text style={styles.body}>Preview: bubble + action glow updates live.</Text>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Typography</Text>
        <Text style={styles.body}>Sora (body) + JetBrains Mono (code)</Text>
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
    fontSize: 14,
    lineHeight: 21,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
