import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import type { DisappearPolicy, RouteMode } from "../core";
import type { SecurityPreferences } from "../state/preferences";
import { COLORS, glow } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";
import { Pill } from "../components/Pill";

export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, "Settings"> & {
  accent: string;
  securityPrefs: SecurityPreferences;
  onToggleBiometricLock: () => void;
  onToggleScreenshotBlock: () => void;
  onToggleAntiDelete: () => void;
  routeMode: RouteMode;
  onSetRoute: (route: RouteMode) => void;
  disappearPolicy: DisappearPolicy;
  onSetDisappearPolicy: (policy: DisappearPolicy) => void;
};

type ToggleRowProps = {
  label: string;
  value: boolean;
  onToggle: () => void;
  accent: string;
};

function ToggleRow({ label, value, onToggle, accent }: ToggleRowProps) {
  return (
    <Pressable onPress={onToggle} style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View
        style={[
          styles.toggleSwitch,
          value
            ? { backgroundColor: glow(accent, 0.15), borderColor: glow(accent, 0.4) }
            : null,
        ]}
      >
        <View
          style={[
            styles.toggleKnob,
            value
              ? { backgroundColor: accent, transform: [{ translateX: 14 }] }
              : null,
          ]}
        />
      </View>
    </Pressable>
  );
}

const POLICIES: DisappearPolicy[] = ["5 min", "1 h", "24 h", "30 d"];

export function SettingsScreen({
  accent,
  securityPrefs,
  onToggleBiometricLock,
  onToggleScreenshotBlock,
  onToggleAntiDelete,
  routeMode,
  onSetRoute,
  disappearPolicy,
  onSetDisappearPolicy,
  navigation,
}: SettingsScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Settings" subtitle="Privacy & security preferences" />

      <Card>
        <Text style={styles.sectionLabel}>Network</Text>
        <View style={styles.pillRow}>
          <Pill
            label="Direct P2P"
            color="#00FF88"
            active={routeMode === "Direct P2P"}
            onPress={() => onSetRoute("Direct P2P")}
          />
          <Pill
            label="2-hop Relay"
            color="#00D4FF"
            active={routeMode === "2-hop Relay"}
            onPress={() => onSetRoute("2-hop Relay")}
          />
          <Pill
            label="Tor"
            color="#FF4B6E"
            active={routeMode === "Tor"}
            onPress={() => onSetRoute("Tor")}
          />
        </View>
        <Text style={styles.networkHint}>Direct P2P is fastest. Use Relay or Tor for more privacy.</Text>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Disappearing Messages</Text>
        <View style={styles.pillRow}>
          {POLICIES.map((p) => (
            <Pill
              key={p}
              label={p}
              color={accent}
              active={disappearPolicy === p}
              onPress={() => onSetDisappearPolicy(p)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Security</Text>
        <ToggleRow
          label="Biometric Lock"
          value={securityPrefs.biometricLock}
          onToggle={onToggleBiometricLock}
          accent={accent}
        />
        <ToggleRow
          label="Screenshot Block"
          value={securityPrefs.screenshotBlock}
          onToggle={onToggleScreenshotBlock}
          accent={accent}
        />
        <ToggleRow
          label="Anti-Delete Protection"
          value={securityPrefs.antiDelete}
          onToggle={onToggleAntiDelete}
          accent={accent}
        />
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>More</Text>
        <View style={styles.linkGroup}>
          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate("Appearance")}
          >
            <Text style={styles.linkText}>Appearance</Text>
            <Text style={styles.linkArrow}>{">"}</Text>
          </Pressable>
          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate("Profile")}
          >
            <Text style={styles.linkText}>Profile</Text>
            <Text style={styles.linkArrow}>{">"}</Text>
          </Pressable>
          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate("Backup")}
          >
            <Text style={styles.linkText}>Backup & Export</Text>
            <Text style={styles.linkArrow}>{">"}</Text>
          </Pressable>
        </View>
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
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.03)",
  },
  toggleLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  toggleSwitch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.bgElevated,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.textMuted,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  networkHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
  linkGroup: {
    gap: 4,
  },
  linkButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
  },
  linkText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  linkArrow: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
});
