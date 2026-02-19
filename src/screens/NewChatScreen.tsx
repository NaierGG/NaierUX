import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import type { ContactProfile, TrustState } from "../core";
import { COLORS, glow } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";

export type NewChatScreenProps = NativeStackScreenProps<RootStackParamList, "NewChat"> & {
  accent: string;
  contacts: ContactProfile[];
  onStartChat: (peerId: string, name: string, trust?: TrustState) => void;
};

export function NewChatScreen({ accent, contacts, onStartChat }: NewChatScreenProps) {
  const [query, setQuery] = useState("");
  const [manualPeerId, setManualPeerId] = useState("");
  const [manualName, setManualName] = useState("");

  const filteredContacts = useMemo(
    () =>
      contacts.filter(
        (c) =>
          !query ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.peerId.toLowerCase().includes(query.toLowerCase()),
      ),
    [contacts, query],
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="New Chat" subtitle="Search contacts or add by direct peer id" />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search contact / peer id..."
        placeholderTextColor={COLORS.textMuted}
        style={styles.searchInput}
      />

      <Card>
        <Text style={styles.sectionLabel}>Add Contact</Text>
        <Text style={styles.helperText}>Current method: Direct Peer ID (Profile {" > "} Network Peer ID).</Text>
        <View style={styles.methodRow}>
          <View style={[styles.methodChip, { borderColor: glow(accent, 0.3) }]}>
            <Text style={[styles.methodText, { color: accent }]}>Direct ID (Live)</Text>
          </View>
          <View style={styles.methodChip}>
            <Text style={styles.methodText}>QR (Soon)</Text>
          </View>
          <View style={styles.methodChip}>
            <Text style={styles.methodText}>NFC / Link (Soon)</Text>
          </View>
        </View>
      </Card>

      {filteredContacts.map((contact) => (
        <View key={contact.peerId} style={styles.contactCard}>
          <Avatar label={contact.name} online={contact.online} borderColor={COLORS.glassBorderHover} />
          <View style={styles.contactMeta}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactPeer}>{contact.peerId}</Text>
          </View>
          <Pressable
            style={[styles.startButton, { borderColor: glow(accent, 0.4), backgroundColor: glow(accent, 0.08) }]}
            onPress={() => onStartChat(contact.peerId, contact.name, contact.trust)}
          >
            <Text style={[styles.startButtonText, { color: accent }]}>Start</Text>
          </Pressable>
        </View>
      ))}

      <Card>
        <Text style={styles.sectionLabel}>Direct Peer ID</Text>
        <Text style={styles.helperText}>Paste the peer id your friend shared with you.</Text>
        <TextInput
          value={manualPeerId}
          onChangeText={setManualPeerId}
          placeholder="peer-custom-id"
          placeholderTextColor={COLORS.textMuted}
          style={styles.peerInput}
        />
        <TextInput
          value={manualName}
          onChangeText={setManualName}
          placeholder="Display name (optional)"
          placeholderTextColor={COLORS.textMuted}
          style={styles.peerInput}
        />
        <Pressable
          disabled={!manualPeerId.trim()}
          style={[
            styles.manualStartButton,
            { borderColor: glow(accent, 0.4), backgroundColor: glow(accent, 0.08) },
            !manualPeerId.trim() ? styles.manualStartButtonDisabled : null,
          ]}
          onPress={() => {
            const peerId = manualPeerId.trim();
            if (!peerId) {
              return;
            }
            const name = manualName.trim() || peerId;
            onStartChat(peerId, name, "unverified");
            setManualPeerId("");
            setManualName("");
          }}
        >
          <Text style={[styles.manualStartButtonText, { color: accent }]}>Start Secure Chat</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.inputBg,
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 10,
  },
  methodRow: {
    flexDirection: "row",
    gap: 10,
  },
  methodChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.bgElevated,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  methodText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
  },
  contactMeta: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactPeer: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  startButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  peerInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.inputBg,
    color: COLORS.textPrimary,
    paddingHorizontal: 14,
    fontSize: 13,
    marginBottom: 10,
  },
  manualStartButton: {
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  manualStartButtonDisabled: {
    opacity: 0.45,
  },
  manualStartButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
