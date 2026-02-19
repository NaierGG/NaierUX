import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CryptoCapability, IdentityProfile } from "../core";
import type { RootStackParamList } from "../navigation/types";
import { COLORS } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Avatar } from "../components/Avatar";
import { Card } from "../components/Card";

export type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, "Profile"> & {
  identity: IdentityProfile;
  cryptoCapability: CryptoCapability;
};

function chunkFingerprint(fingerprint: string): [string, string] {
  const mid = Math.ceil(fingerprint.length / 2);
  return [fingerprint.slice(0, mid), fingerprint.slice(mid)];
}

export function ProfileScreen({ identity, cryptoCapability }: ProfileScreenProps) {
  const [fpTop, fpBottom] = chunkFingerprint(identity.publicFingerprint);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Profile" subtitle="Self-sovereign identity" />

      <View style={styles.identityBlock}>
        <Avatar label={identity.displayName} size={80} borderColor={COLORS.accentMain} />
        <View style={styles.identityStateRow}>
          <View style={styles.identityDot} />
          <Text style={styles.identityStateText}>Identity Active</Text>
        </View>
      </View>

      <Card>
        <Text style={styles.label}>Public key</Text>
        <Text numberOfLines={1} style={styles.monoMuted}>
          {identity.publicFingerprint}-PUBKEY-LOCAL-ONLY-SESSION
        </Text>
      </Card>

      <Card>
        <Text style={styles.label}>Key fingerprint</Text>
        <Text style={styles.monoAccent}>{fpTop}</Text>
        <Text style={styles.monoAccent}>{fpBottom}</Text>
        <Text style={styles.hint}>Compare fingerprint in person before trust upgrade.</Text>
      </Card>

      <View style={styles.securityGrid}>
        <Card>
          <Text style={[styles.cardIcon, styles.cardIconGreen]}>E</Text>
          <Text style={styles.secLabel}>Encryption</Text>
          <Text style={styles.secValue}>{cryptoCapability.scheme}</Text>
        </Card>
        <Card>
          <Text style={[styles.cardIcon, styles.cardIconCyan]}>N</Text>
          <Text style={styles.secLabel}>Network</Text>
          <Text style={styles.secValue}>Adaptive route fallback</Text>
        </Card>
        <Card>
          <Text style={[styles.cardIcon, styles.cardIconRed]}>S</Text>
          <Text style={styles.secLabel}>Storage</Text>
          <Text style={styles.secValue}>Encrypted local queue</Text>
        </Card>
        <Card>
          <Text style={[styles.cardIcon, styles.cardIconPurple]}>C</Text>
          <Text style={styles.secLabel}>Created</Text>
          <Text style={styles.secValue}>{identity.createdAtIso.slice(0, 10)}</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  identityBlock: {
    alignItems: "center",
    paddingVertical: 6,
  },
  identityStateRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  identityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accentMain,
  },
  identityStateText: {
    color: COLORS.accentMain,
    fontSize: 12,
    fontWeight: "600",
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  monoMuted: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: "monospace",
  },
  monoAccent: {
    color: COLORS.accentCyber,
    fontSize: 13,
    fontFamily: "monospace",
    lineHeight: 20,
  },
  hint: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  securityGrid: {
    gap: 8,
  },
  cardIcon: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardIconGreen: {
    color: COLORS.accentMain,
  },
  cardIconCyan: {
    color: COLORS.accentCyber,
  },
  cardIconRed: {
    color: COLORS.accentAlert,
  },
  cardIconPurple: {
    color: COLORS.accentHighlight,
  },
  secLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  secValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
});
