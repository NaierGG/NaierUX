import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ContactProfile, TrustState } from "../core";
import type { ContactRequest } from "../state/appStateStore";
import { COLORS, glow } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Avatar } from "../components/Avatar";

export type ContactsScreenProps = {
  accent: string;
  contacts: ContactProfile[];
  contactRequests: ContactRequest[];
  blockedPeers: string[];
  onStartChat: (peerId: string, name: string, trust?: TrustState) => void;
  onAcceptRequest: (peerId: string, name?: string) => void;
  onDeclineRequest: (peerId: string) => void;
  onCancelOutgoingRequest: (peerId: string) => void;
  onBlockPeer: (peerId: string) => void;
  onUnblockPeer: (peerId: string) => void;
};

function trustLabel(trust: string): string {
  if (trust === "verified") return "+ Verified";
  if (trust === "changed_key") return "! Key Changed";
  return "- Unverified";
}

function trustColor(trust: string): string {
  if (trust === "verified") return "#00FF88";
  if (trust === "changed_key") return "#FF4B6E";
  return "#00D4FF";
}

export function ContactsScreen({
  accent,
  contacts,
  contactRequests,
  blockedPeers,
  onStartChat,
  onAcceptRequest,
  onDeclineRequest,
  onCancelOutgoingRequest,
  onBlockPeer,
  onUnblockPeer,
}: ContactsScreenProps) {
  const [search, setSearch] = useState("");

  const filteredContacts = useMemo(
    () =>
      contacts.filter(
        (c) =>
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.peerId.toLowerCase().includes(search.toLowerCase()),
      ),
    [contacts, search],
  );

  const incomingRequests = useMemo(
    () =>
      contactRequests.filter(
        (request) =>
          request.direction === "incoming" &&
          (!search ||
            request.name.toLowerCase().includes(search.toLowerCase()) ||
            request.peerId.toLowerCase().includes(search.toLowerCase())),
      ),
    [contactRequests, search],
  );

  const outgoingRequests = useMemo(
    () =>
      contactRequests.filter(
        (request) =>
          request.direction === "outgoing" &&
          (!search ||
            request.name.toLowerCase().includes(search.toLowerCase()) ||
            request.peerId.toLowerCase().includes(search.toLowerCase())),
      ),
    [contactRequests, search],
  );

  const filteredBlockedPeers = useMemo(
    () =>
      blockedPeers.filter(
        (peerId) =>
          !search ||
          peerId.toLowerCase().includes(search.toLowerCase()),
      ),
    [blockedPeers, search],
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader
        title="Contacts"
        subtitle={contacts.length === 0 ? "No contacts yet" : `${contacts.length} saved contacts`}
      />

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search contacts..."
        placeholderTextColor={COLORS.textMuted}
        style={styles.searchInput}
      />

      {incomingRequests.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Incoming Requests</Text>
          {incomingRequests.map((request) => (
            <View key={request.peerId} style={styles.requestRow}>
              <View style={styles.meta}>
                <Text style={styles.name}>{request.name}</Text>
                <Text style={styles.peerId}>{request.peerId}</Text>
                {request.preview ? <Text style={styles.preview}>{request.preview}</Text> : null}
              </View>
              <View style={styles.requestActions}>
                <Pressable
                  style={[styles.smallAction, { borderColor: glow(accent, 0.4) }]}
                  onPress={() => onAcceptRequest(request.peerId, request.name)}
                >
                  <Text style={[styles.smallActionText, { color: accent }]}>Accept</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallAction, { borderColor: COLORS.glassBorder }]}
                  onPress={() => onDeclineRequest(request.peerId)}
                >
                  <Text style={styles.smallActionText}>Decline</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallAction, { borderColor: glow(COLORS.danger, 0.4) }]}
                  onPress={() => onBlockPeer(request.peerId)}
                >
                  <Text style={[styles.smallActionText, { color: COLORS.danger }]}>Block</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {outgoingRequests.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Outgoing Requests</Text>
          {outgoingRequests.map((request) => (
            <View key={request.peerId} style={styles.requestRow}>
              <View style={styles.meta}>
                <Text style={styles.name}>{request.name}</Text>
                <Text style={styles.peerId}>{request.peerId}</Text>
                <Text style={styles.preview}>Waiting for response</Text>
              </View>
              <Pressable
                style={[styles.smallAction, { borderColor: COLORS.glassBorder }]}
                onPress={() => onCancelOutgoingRequest(request.peerId)}
              >
                <Text style={styles.smallActionText}>Cancel</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Contacts</Text>
        {filteredContacts.length === 0 ? (
          <View style={styles.emptyContacts}>
            <Text style={styles.emptyContactsText}>
              {search ? "No contacts match your search." : "No contacts yet. Add someone via New Chat."}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredContacts.map((contact) => (
              <View key={contact.peerId} style={styles.row}>
                <Avatar label={contact.name} online={contact.online} borderColor={COLORS.glassBorderHover} />
                <View style={styles.meta}>
                  <Text style={styles.name}>{contact.name}</Text>
                  <Text style={styles.peerId}>{contact.peerId}</Text>
                  <Text style={[styles.trust, { color: trustColor(contact.trust) }]}>
                    {trustLabel(contact.trust)}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.chatButton, { borderColor: glow(accent, 0.4) }]}
                    onPress={() => onStartChat(contact.peerId, contact.name, contact.trust)}
                  >
                    <Text style={[styles.chatButtonText, { color: accent }]}>Chat</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.chatButton, { borderColor: glow(COLORS.danger, 0.4) }]}
                    onPress={() => onBlockPeer(contact.peerId)}
                  >
                    <Text style={[styles.chatButtonText, { color: COLORS.danger }]}>Block</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {filteredBlockedPeers.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Blocked</Text>
          {filteredBlockedPeers.map((peerId) => (
            <View key={peerId} style={styles.requestRow}>
              <View style={styles.meta}>
                <Text style={styles.name}>{peerId}</Text>
              </View>
              <Pressable
                style={[styles.smallAction, { borderColor: glow(accent, 0.4) }]}
                onPress={() => onUnblockPeer(peerId)}
              >
                <Text style={[styles.smallActionText, { color: accent }]}>Unblock</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    marginTop: 4,
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
  emptyContacts: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyContactsText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
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
  preview: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  trust: {
    fontSize: 10,
    fontWeight: "600",
  },
  actions: {
    gap: 6,
  },
  requestActions: {
    gap: 6,
    minWidth: 86,
  },
  chatButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
  },
  chatButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  smallAction: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  smallActionText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "600",
  },
});
