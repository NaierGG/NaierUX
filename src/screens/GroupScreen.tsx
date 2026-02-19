import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { COLORS } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";

export type GroupScreenProps = NativeStackScreenProps<RootStackParamList, "Group"> & {
  accent: string;
};

export function GroupScreen({ navigation, accent, route }: GroupScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Ops Mesh" subtitle={`Group ${route.params.groupId} | Onion enforced`} />
      <Card>
        <Text style={styles.body}>Roles: Owner, Moderator, Member</Text>
        <Text style={styles.small}>Group expiry default: 24h</Text>
        <Text style={styles.small}>Moderation: Report + Route policy lock</Text>
      </Card>
      <Pressable
        onPress={() => navigation.navigate("Chat", { peerId: "peer-astra", peerName: "Astra" })}
        style={styles.linkButton}
      >
        <Text style={[styles.linkButtonText, { color: accent }]}>Open Group Thread Prototype</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  body: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  small: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  linkButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#111111",
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
