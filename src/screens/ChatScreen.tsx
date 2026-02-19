import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CallState, ChatMessage, DisappearPolicy, RouteMode, RouteStatus } from "../core";
import type { RootStackParamList } from "../navigation/types";
import { COLORS, routeColor } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { CallControls } from "../components/CallControls";
import { Card } from "../components/Card";
import { MessageBubble } from "../components/MessageBubble";
import { RouteStrip } from "../components/RouteStrip";

export type ChatScreenProps = NativeStackScreenProps<RootStackParamList, "Chat"> & {
  routeMode: RouteMode;
  routeStatus: RouteStatus;
  onSetRoute: (route: RouteMode) => void;
  disappearPolicy: DisappearPolicy;
  onSetDisappearPolicy: (policy: DisappearPolicy) => void;
  inFlightCount: number;
  activeNetworkName: string;
  initError: string | null;
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (draft: string) => void;
  sending: boolean;
  accent: string;
  onSendCurrentDraft: (chatId: string, peerId: string) => Promise<void>;
  callState: CallState;
  onStartSecureCall: (peerId: string, mode: "voice" | "video") => Promise<void>;
  onEndSecureCall: () => Promise<void>;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onSwitchRoute: () => void;
};

function chatIdFromPeer(peerId: string): string {
  if (peerId === "peer-astra") return "chat-astra";
  if (peerId === "peer-node11") return "chat-node11";
  return "chat-ops";
}

export function ChatScreen({
  navigation,
  route,
  routeMode,
  routeStatus,
  onSetRoute,
  disappearPolicy,
  onSetDisappearPolicy,
  inFlightCount,
  activeNetworkName,
  initError,
  messages,
  draft,
  onDraftChange,
  sending,
  accent,
  onSendCurrentDraft,
  callState,
  onStartSecureCall,
  onEndSecureCall,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onSwitchRoute,
}: ChatScreenProps) {
  const chatId = chatIdFromPeer(route.params.peerId);
  const chatMessages = messages.filter((message) => message.chatId === chatId);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader
        title={route.params.peerName}
        titleSize={20}
        subtitle={`${routeMode} | ${routeStatus.latencyMs}ms`}
        rightActionLabel="Call"
        onRightAction={() => {
          void onStartSecureCall(route.params.peerId, "voice");
          navigation.navigate("Call", { peerId: route.params.peerId, mode: "voice" });
        }}
      />

      <RouteStrip route={routeMode} routeStatus={routeStatus} onSelectRoute={onSetRoute} />

      <View style={styles.trustRow}>
        <Text style={styles.trustText}>Screenshot block: ON</Text>
        <Text style={styles.trustText}>Anti-delete: ON</Text>
        <Text style={styles.trustText}>Queue in-flight: {inFlightCount}</Text>
      </View>

      <Card accent={callState.phase === "idle" ? undefined : routeColor(callState.route)}>
        <Text style={styles.callStatusTitle}>
          {callState.phase === "idle" ? "idle  Encrypted channel ready" : `${callState.phase}  ${callState.mode}`}
        </Text>
        <Text style={styles.callStatusMeta}>
          {callState.route} | {callState.latencyMs}ms | bars {callState.bars}/5
        </Text>
        <CallControls
          callState={callState}
          onStartVoice={() => void onStartSecureCall(route.params.peerId, "voice")}
          onStartVideo={() => void onStartSecureCall(route.params.peerId, "video")}
          onToggleMute={onToggleMute}
          onToggleCamera={onToggleCamera}
          onToggleSpeaker={onToggleSpeaker}
          onSwitchRoute={onSwitchRoute}
          onEndCall={() => void onEndSecureCall()}
        />
      </Card>

      <Card>
        <Text style={styles.routeMeta}>Disappearing: {disappearPolicy}</Text>
        <Text style={styles.routeMeta}>Adapter: {activeNetworkName}</Text>
      </Card>

      {initError ? (
        <Card accent={COLORS.accentAlert}>
          <Text style={styles.warning}>Secure transport is blocked.</Text>
          <Text style={styles.small}>{initError}</Text>
        </Card>
      ) : null}

      <View style={styles.messageList}>
        {chatMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </View>

      <View style={styles.policyRow}>
        <Pressable
          onPress={() => onSetDisappearPolicy("5 min")}
          style={[styles.policyChip, disappearPolicy === "5 min" ? styles.policyChipActive : null]}
        >
          <Text style={[styles.policyText, disappearPolicy === "5 min" ? { color: accent } : null]}>5 min</Text>
        </Pressable>
        <Pressable
          onPress={() => onSetDisappearPolicy("1 h")}
          style={[styles.policyChip, disappearPolicy === "1 h" ? styles.policyChipActive : null]}
        >
          <Text style={[styles.policyText, disappearPolicy === "1 h" ? { color: accent } : null]}>1 h</Text>
        </Pressable>
        <Pressable
          onPress={() => onSetDisappearPolicy("24 h")}
          style={[styles.policyChip, disappearPolicy === "24 h" ? styles.policyChipActive : null]}
        >
          <Text style={[styles.policyText, disappearPolicy === "24 h" ? { color: accent } : null]}>24 h</Text>
        </Pressable>
        <Pressable
          onPress={() => onSetDisappearPolicy("30 d")}
          style={[styles.policyChip, disappearPolicy === "30 d" ? styles.policyChipActive : null]}
        >
          <Text style={[styles.policyText, disappearPolicy === "30 d" ? { color: accent } : null]}>30 d</Text>
        </Pressable>
      </View>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          placeholder="Encrypted message"
          placeholderTextColor={COLORS.textSecondary}
          style={styles.composerInput}
        />
        <Pressable
          onPress={() => void onSendCurrentDraft(chatId, route.params.peerId)}
          disabled={Boolean(initError)}
          style={[
            styles.sendButton,
            { borderColor: accent },
            initError ? styles.sendButtonDisabled : null,
          ]}
        >
          <Text style={[styles.sendText, { color: accent }]}>
            {initError ? "Blocked" : sending ? "..." : "Send"}
          </Text>
        </Pressable>
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
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  trustText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  callStatusTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  callStatusMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  routeMeta: {
    color: COLORS.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  warning: {
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  small: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  messageList: {
    gap: 8,
  },
  policyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  policyChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#131313",
  },
  policyChipActive: {
    borderColor: COLORS.accentCyber,
  },
  policyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  composer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  composerInput: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#272727",
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
  },
  sendButton: {
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
