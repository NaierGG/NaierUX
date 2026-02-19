import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
      <View style={styles.hero}>
        <Text style={styles.logo}>Naier</Text>
        <Text style={styles.tagline}>Talk without traces</Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Local-first identity</Text>
        <Text style={styles.body}>
          Your keys never leave this device. No server can impersonate you.
        </Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Route-aware messaging</Text>
        <Text style={styles.body}>
          Choose Direct P2P, 2-hop Relay, or Tor per conversation thread.
        </Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Zero metadata</Text>
        <Text style={styles.body}>
          No phone number. No cloud. Disappearing messages by default.
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
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 6,
  },
  logo: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.accentMain,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
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
});
