import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { COLORS, glow } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";

export type GroupScreenProps = NativeStackScreenProps<RootStackParamList, "Group"> & {
  accent: string;
};

export function GroupScreen({ navigation, accent, route }: GroupScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Groups" subtitle={`Group ${route.params.groupId} | Secure routing`} />

      <Card>
        <Text style={styles.sectionLabel}>Group Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Roles:</Text>
          <Text style={styles.infoVal}>Owner, Moderator, Member</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Expiry:</Text>
          <Text style={styles.infoVal}>24h default</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Status:</Text>
          <Text style={styles.infoVal}>Create or join with a trusted invite.</Text>
        </View>
      </Card>

      <Pressable
        onPress={() => navigation.navigate("NewChat")}
        style={[styles.linkButton, { borderColor: glow(accent, 0.3) }]}
      >
        <Text style={[styles.linkButtonText, { color: accent }]}>Start Secure Chat</Text>
        <Text style={styles.linkArrow}>→</Text>
      </Pressable>
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
  infoRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.03)",
  },
  infoKey: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
    width: 100,
  },
  infoVal: {
    color: COLORS.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  linkButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.glass,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  linkArrow: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
});
