import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { COLORS } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Avatar } from "../components/Avatar";
import { Card } from "../components/Card";

export type ContactsScreenProps = NativeStackScreenProps<RootStackParamList, "Contacts">;

type ContactItem = {
  id: string;
  name: string;
  fingerprintPreview: string;
  online: boolean;
};

const CONTACTS: ContactItem[] = [
  { id: "peer-astra", name: "Astra", fingerprintPreview: "8A4D:2C9F:77E1", online: true },
  { id: "peer-node11", name: "Node-11", fingerprintPreview: "11AF:33B0:88D2", online: false },
  { id: "peer-sable", name: "Sable", fingerprintPreview: "9FD1:12AC:44E0", online: true },
];

export function ContactsScreen({ navigation }: ContactsScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Contacts" subtitle="Verified first" />
      <TextInput
        style={styles.search}
        placeholder="Search name / fingerprint"
        placeholderTextColor={COLORS.textSecondary}
      />

      <View style={styles.list}>
        {CONTACTS.map((contact) => (
          <Card key={contact.id}>
            <View style={styles.row}>
              <Avatar label={contact.name} online={contact.online} />
              <View style={styles.meta}>
                <Text style={styles.name}>{contact.name}</Text>
                <Text style={styles.fp}>{contact.fingerprintPreview}</Text>
              </View>
              <Pressable
                style={styles.chatAction}
                onPress={() => navigation.navigate("Chat", { peerId: contact.id, peerName: contact.name })}
              >
                <Text style={styles.chatActionText}>Chat</Text>
              </Pressable>
            </View>
          </Card>
        ))}
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
  search: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  meta: {
    flex: 1,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  fp: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  chatAction: {
    borderWidth: 1,
    borderColor: COLORS.accentCyber,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chatActionText: {
    color: COLORS.accentCyber,
    fontSize: 12,
    fontWeight: "600",
  },
});
