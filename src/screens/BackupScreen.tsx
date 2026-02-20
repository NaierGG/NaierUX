import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { COLORS, glow } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";

export type BackupScreenProps = NativeStackScreenProps<RootStackParamList, "Backup"> & {
  accent: string;
  onExportBackup: () => Promise<string>;
  onImportBackup: (payload: string) => Promise<{ ok: boolean; error?: string }>;
};

export function BackupScreen({ navigation, accent, onExportBackup, onImportBackup }: BackupScreenProps) {
  const [backupPayload, setBackupPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader
        title="Backup & Export"
        subtitle="Encrypted local backup payload"
        onBack={() => navigation.goBack()}
      />

      <Card>
        <Text style={styles.sectionLabel}>Generate Backup</Text>
        <Text style={styles.body}>
          Creates an encrypted payload for chats, contacts, settings, requests, and blocked peers.
        </Text>
        <Pressable
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            setError(null);
            setStatus(null);
            try {
              const payload = await onExportBackup();
              setBackupPayload(payload);
              setStatus("Encrypted backup payload generated.");
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Failed to export backup.");
            } finally {
              setBusy(false);
            }
          }}
          style={[
            styles.actionButton,
            { borderColor: glow(accent, 0.45), backgroundColor: glow(accent, 0.08) },
            busy ? styles.disabledButton : null,
          ]}
        >
          <Text style={[styles.actionButtonText, { color: accent }]}>
            {busy ? "Working..." : "Generate Encrypted Backup"}
          </Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Backup Payload</Text>
        <TextInput
          multiline
          value={backupPayload}
          onChangeText={setBackupPayload}
          placeholder="Encrypted backup payload..."
          placeholderTextColor={COLORS.textMuted}
          style={styles.payloadInput}
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical="top"
        />
        {status ? <Text style={styles.successText}>{status}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.row}>
          <Pressable
            disabled={busy || !backupPayload.trim()}
            onPress={() => setBackupPayload("")}
            style={[
              styles.smallButton,
              { borderColor: COLORS.glassBorder, backgroundColor: COLORS.bgElevated },
              (busy || !backupPayload.trim()) ? styles.disabledButton : null,
            ]}
          >
            <Text style={styles.smallButtonText}>Clear</Text>
          </Pressable>
          <Pressable
            disabled={busy || !backupPayload.trim()}
            onPress={async () => {
              if (!backupPayload.trim()) {
                return;
              }
              setBusy(true);
              setError(null);
              setStatus(null);
              const result = await onImportBackup(backupPayload.trim());
              if (result.ok) {
                setStatus("Backup imported successfully.");
              } else {
                setError(result.error ?? "Backup import failed.");
              }
              setBusy(false);
            }}
            style={[
              styles.smallButton,
              { borderColor: glow(accent, 0.45), backgroundColor: glow(accent, 0.08) },
              (busy || !backupPayload.trim()) ? styles.disabledButton : null,
            ]}
          >
            <Text style={[styles.smallButtonText, { color: accent }]}>Import Backup</Text>
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
    marginBottom: 10,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  actionButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  payloadInput: {
    minHeight: 180,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.inputBg,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  successText: {
    color: COLORS.success,
    fontSize: 12,
    marginBottom: 8,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  smallButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  smallButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
