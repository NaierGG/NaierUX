import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ChatPreview, RouteMode, RouteStatus } from "../core";
import { COLORS, routeColor } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";
import { ChatRow } from "../components/ChatRow";
import { RouteStrip } from "../components/RouteStrip";

export type HomeScreenProps = {
  chats: ChatPreview[];
  routeMode: RouteMode;
  routeStatus: RouteStatus;
  accent: string;
  activeChatId: string;
  onPressChat: (chatId: string) => void;
  onSetRoute: (route: RouteMode) => void;
};

export function HomeScreen({
  chats,
  routeMode,
  routeStatus,
  accent,
  activeChatId,
  onPressChat,
  onSetRoute,
}: HomeScreenProps) {
  const [search, setSearch] = useState("");

  const filteredChats = useMemo(
    () =>
      chats.filter(
        (c) =>
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(search.toLowerCase()),
      ),
    [chats, search],
  );

  const unreadTotal = useMemo(() => chats.reduce((sum, c) => sum + c.unread, 0), [chats]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Chats" subtitle="Local-first inbox" />

      {/* Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{chats.length}</Text>
          <Text style={styles.metricLabel}>Threads</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, unreadTotal > 0 ? { color: accent } : null]}>
            {unreadTotal}
          </Text>
          <Text style={styles.metricLabel}>Unread</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: routeColor(routeMode) }]}>
            {routeMode === "Direct P2P" ? "P2P" : routeMode === "2-hop Relay" ? "Relay" : "Tor"}
          </Text>
          <Text style={styles.metricLabel}>Route</Text>
        </View>
      </View>

      <RouteStrip route={routeMode} routeStatus={routeStatus} onSelectRoute={onSetRoute} />

      {/* Search */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search threads..."
        placeholderTextColor={COLORS.textMuted}
        style={styles.searchInput}
      />

      {/* Chat List */}
      <View style={styles.chatList}>
        {filteredChats.map((row) => (
          <ChatRow
            key={row.id}
            name={row.name}
            preview={row.lastMessage}
            timeLabel={row.timeLabel}
            unread={row.unread}
            route={routeMode}
            accent={accent}
            active={row.id === activeChatId}
            onPress={() => onPressChat(row.id)}
          />
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
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricItem: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 14,
    alignItems: "center",
  },
  metricValue: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
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
  chatList: {
    gap: 4,
  },
});
