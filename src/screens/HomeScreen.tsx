import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RouteMode, RouteStatus } from "../core";
import { CHAT_PREVIEWS } from "../state/mockData";
import { COLORS } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/types";
import { AppHeader } from "../components/AppHeader";
import { ChatRow } from "../components/ChatRow";
import { RouteStrip } from "../components/RouteStrip";

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home"> & {
  accent: string;
  routeMode: RouteMode;
  routeStatus: RouteStatus;
  onSetRoute: (route: RouteMode) => void;
};

function peerIdFromChatId(chatId: string): string {
  if (chatId === "chat-astra") return "peer-astra";
  if (chatId === "chat-node11") return "peer-node11";
  return "peer-ops";
}

function rowRoute(chatId: string, currentRoute: RouteMode): RouteMode {
  if (chatId === "chat-astra") return currentRoute;
  if (chatId === "chat-node11") return "2-hop Relay";
  return "Tor";
}

export function HomeScreen({ navigation, accent, routeMode, routeStatus, onSetRoute }: HomeScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader
        title="Chats"
        subtitle="Local-first inbox"
        rightActionLabel="New"
        onRightAction={() => navigation.navigate("NewChat")}
      />
      <RouteStrip route={routeMode} routeStatus={routeStatus} onSelectRoute={onSetRoute} />
      <Text style={styles.sectionTitle}>Recent</Text>
      {CHAT_PREVIEWS.map((row) => (
        <ChatRow
          key={row.id}
          name={row.name}
          preview={row.lastMessage}
          timeLabel={row.timeLabel}
          unread={row.unread}
          route={rowRoute(row.id, routeMode)}
          accent={accent}
          active={row.id === "chat-astra"}
          onPress={() =>
            navigation.navigate("Chat", {
              peerId: peerIdFromChatId(row.id),
              peerName: row.name,
            })
          }
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
  },
});
