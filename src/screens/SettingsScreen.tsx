import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { COLORS } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";

type ToggleRowProps = {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export type DisappearSelection = "Off" | "5 minutes" | "1 hour" | "24 hours" | "7 days";

export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, "Settings"> & {
  disappearSelection: DisappearSelection;
  onChangeDisappearSelection: (value: DisappearSelection) => void;
};

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ToggleRow({ icon, label, description, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleIcon}>{icon}</Text>
      <View style={styles.toggleMeta}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#303030", true: "#00FF88" }}
        thumbColor={value ? "#0A0A0A" : "#888888"}
      />
    </View>
  );
}

const DISAPPEAR_OPTIONS: DisappearSelection[] = ["Off", "5 minutes", "1 hour", "24 hours", "7 days"];

export function SettingsScreen({ disappearSelection, onChangeDisappearSelection }: SettingsScreenProps) {
  const [biometric, setBiometric] = useState(true);
  const [screenshotBlock, setScreenshotBlock] = useState(true);
  const [antiDelete, setAntiDelete] = useState(true);
  const [torDefault, setTorDefault] = useState(false);
  const [relayFallback, setRelayFallback] = useState(true);

  const securityRows = useMemo(
    () => [
      {
        icon: "L",
        label: "Biometric lock",
        description: "Unlock app with local biometric auth.",
        value: biometric,
        onValueChange: setBiometric,
      },
      {
        icon: "S",
        label: "Screenshot block",
        description: "Block OS screenshots in protected screens.",
        value: screenshotBlock,
        onValueChange: setScreenshotBlock,
      },
      {
        icon: "A",
        label: "Anti-delete protection",
        description: "Preserve message history integrity markers.",
        value: antiDelete,
        onValueChange: setAntiDelete,
      },
    ],
    [antiDelete, biometric, screenshotBlock],
  );

  const networkRows = useMemo(
    () => [
      {
        icon: "P",
        label: "Prefer direct P2P",
        description: "Use direct route whenever reachable.",
        value: !torDefault,
        onValueChange: (value: boolean) => setTorDefault(!value),
      },
      {
        icon: "R",
        label: "Relay fallback",
        description: "Fail over to relay route when direct path fails.",
        value: relayFallback,
        onValueChange: setRelayFallback,
      },
    ],
    [relayFallback, torDefault],
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Settings" subtitle="Security and privacy first" />

      <SectionTitle title="SECURITY & PRIVACY" />
      <Card>
        {securityRows.map((row) => (
          <ToggleRow key={row.label} {...row} />
        ))}
      </Card>

      <SectionTitle title="NETWORK" />
      <Card>
        {networkRows.map((row) => (
          <ToggleRow key={row.label} {...row} />
        ))}
      </Card>

      <SectionTitle title="DISAPPEARING MESSAGES" />
      <Card>
        <View style={styles.radioList}>
          {DISAPPEAR_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={styles.radioRow}
              onPress={() => onChangeDisappearSelection(option)}
            >
              <View style={styles.radioIconWrap}>
                <View
                  style={[
                    styles.radioIcon,
                    disappearSelection === option ? styles.radioIconActive : null,
                  ]}
                />
              </View>
              <Text style={styles.radioLabel}>{option}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <SectionTitle title="DATA" />
      <Card>
        <Text style={styles.dataText}>Local encrypted backup: Ready</Text>
        <Text style={styles.dataText}>Device export: Air-gapped recommended</Text>
        <Text style={styles.dataText}>Identity seed checksum: Verified</Text>
      </Card>

      <Pressable style={styles.deleteAction}>
        <Text style={styles.deleteActionText}>Delete All Data & Identity</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  toggleIcon: {
    color: COLORS.accentCyber,
    fontSize: 14,
    width: 18,
    textAlign: "center",
    fontWeight: "700",
  },
  toggleMeta: {
    flex: 1,
  },
  toggleLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  toggleDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  radioList: {
    gap: 8,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radioIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    alignItems: "center",
    justifyContent: "center",
  },
  radioIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  radioIconActive: {
    backgroundColor: COLORS.accentMain,
  },
  radioLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  dataText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  deleteAction: {
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  deleteActionText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "600",
  },
});
