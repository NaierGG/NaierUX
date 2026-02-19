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
      <AppHeader title="Appearance" subtitle="Dark-only mode enforced" />
      <Card>
        <Text style={styles.largeLabel}>Accent Picker</Text>
        <View style={styles.rowWrap}>
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
        <Text style={styles.body}>Preview bubble + action glow updates live.</Text>
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
  largeLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  body: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
});
