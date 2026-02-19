import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { COLORS } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";

export type SplashScreenProps = NativeStackScreenProps<RootStackParamList, "Splash"> & {
  accent: string;
};

export function SplashScreen({ navigation, accent }: SplashScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Naier" subtitle="Talk without traces. Connect without masters." />
      <Card accent={accent}>
        <Text style={styles.largeLabel}>Onboarding 1/3</Text>
        <Text style={styles.body}>
          Identity is local-first. No phone number, no central account authority.
        </Text>
      </Card>
      <Card>
        <Text style={styles.largeLabel}>Onboarding 2/3</Text>
        <Text style={styles.body}>
          Messages are E2EE with forward secrecy and route fallback transparency.
        </Text>
      </Card>
      <Card>
        <Text style={styles.largeLabel}>Onboarding 3/3</Text>
        <Text style={styles.body}>
          Control route policy, trust fingerprints, and disappearing defaults before first chat.
        </Text>
      </Card>
      <Pressable
        onPress={() => navigation.navigate("Recovery")}
        style={[styles.primaryButton, { borderColor: accent }]}
      >
        <Text style={[styles.primaryButtonText, { color: accent }]}>Create Identity</Text>
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
    letterSpacing: -0.1,
  },
});
