import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ContactProfile, TrustState } from "../core";
import { COLORS, glow } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";

export type ContactsScreenProps = {
  accent: string;
  contacts: ContactProfile[];
  onStartChat: (peerId: string, name: string, trust?: TrustState) => void;
};

function trustLabel(trust: string): string {
  if (trust === "verified") return "Verified";
  if (trust === "changed_key") return "Key Changed ⚠";
  return "Unverified";
}

function trustColor(trust: string): string {
  if (trust === "verified") return "#00FF88";
  if (trust === "changed_key") return "#FF4B6E";
  return "#00D4FF";
}

export function ContactsScreen({ accent, contacts, onStartChat }: ContactsScreenProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      contacts.filter(
        (c) =>
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.peerId.toLowerCase().includes(search.toLowerCase()),
      ),
    [contacts, search],
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Contacts" subtitle={`${contacts.length} peers connected`} />

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search contacts..."
        placeholderTextColor={COLORS.textMuted}
        style={styles.searchInput}
      />

      <View style={styles.list}>
        {filtered.map((contact) => (
          <View key={contact.peerId} style={styles.row}>
            <Avatar label={contact.name} online={contact.online} borderColor={COLORS.glassBorderHover} />
            <View style={styles.meta}>
              <Text style={styles.name}>{contact.name}</Text>
              <Text style={styles.peerId}>{contact.peerId}</Text>
              <Text style={[styles.trust, { color: trustColor(contact.trust) }]}>
                {trustLabel(contact.trust)}
              </Text>
            </View>
            <Pressable
              style={[styles.chatButton, { borderColor: glow(accent, 0.4) }]}
              onPress={() => onStartChat(contact.peerId, contact.name, contact.trust)}
            >
              <Text style={[styles.chatButtonText, { color: accent }]}>Chat</Text>
            </Pressable>
          </View>
        ))}
      </View>
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
  list: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  peerId: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  trust: {
    fontSize: 10,
    fontWeight: "600",
  },
  chatButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chatButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
