import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { COLORS } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Avatar } from "../components/Avatar";
import { Card } from "../components/Card";

export type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, "Profile"> & {
  accent: string;
  fingerprint: string;
  peerId: string;
};

export function ProfileScreen({ accent, fingerprint, peerId }: ProfileScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        <Avatar label="Me" size={80} borderColor={accent} />
        <Text style={styles.profileName}>Local Identity</Text>
        <Text style={styles.profileSub}>No phone. No cloud. Just keys.</Text>
      </View>

      <Card>
        <Text style={styles.infoLabel}>Fingerprint</Text>
        <Text style={styles.infoValue}>{fingerprint}</Text>
      </Card>

      <Card>
        <Text style={styles.infoLabel}>Network Peer ID</Text>
        <Text style={styles.infoValue}>{peerId}</Text>
      </Card>

      <Card>
        <Text style={styles.infoLabel}>Key Type</Text>
        <Text style={styles.body}>Ed25519 • Generated locally</Text>
      </Card>

      <Card>
        <Text style={styles.infoLabel}>Security</Text>
        <Text style={styles.body}>Biometric lock enabled</Text>
        <Text style={styles.body}>Anti-screenshot active</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 6,
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 10,
  },
  profileSub: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoValue: {
    color: COLORS.accentCyber,
    fontSize: 12,
    lineHeight: 18,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
