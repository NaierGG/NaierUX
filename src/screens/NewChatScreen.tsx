import React from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/types";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";
import { Pill } from "../components/Pill";

export type NewChatScreenProps = NativeStackScreenProps<RootStackParamList, "NewChat"> & {
  accent: string;
};

export function NewChatScreen({ accent }: NewChatScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="New Chat" subtitle="Search by name or fingerprint" />
      <TextInput
        placeholder="Search contact / fingerprint"
        placeholderTextColor={COLORS.textSecondary}
        style={styles.searchInput}
      />
      <Card>
        <Text style={styles.largeLabel}>Add Contact</Text>
        <View style={styles.rowWrap}>
          <Pill label="Scan QR" color={accent} />
          <Pill label="NFC Tap" color={accent} />
          <Pill label="Invite Link" color={accent} />
        </View>
      </Card>
      <Card>
        <Text style={styles.body}>Trust states: Verified, Unverified, Key Changed.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
  },
  largeLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  body: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
});
