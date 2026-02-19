import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import type { CallState, ChatMessage, DisappearPolicy, RouteMode, RouteStatus, TrustState } from "../core";
import type { SecurityPreferences } from "../state/preferences";
import { COLORS, glow, routeColor } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { RouteStrip } from "../components/RouteStrip";
import { CallControls } from "../components/CallControls";
import { MessageBubble } from "../components/MessageBubble";
import { Pill } from "../components/Pill";
import { chatIdFromPeerId } from "../state/peer";

export type ChatScreenProps = NativeStackScreenProps<RootStackParamList, "Chat"> & {
  routeMode: RouteMode;
  routeStatus: RouteStatus;
  accent: string;
  chatMessages: ChatMessage[];
  callState: CallState;
  onSetRoute: (route: RouteMode) => void;
  onStartVoice: () => void;
  onStartVideo: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onSwitchRoute: () => void;
  onEndCall: () => void;
  initError: string | null;
  draft: string;
  onDraftChange: (text: string) => void;
  sending: boolean;
  onSendCurrentDraft: (chatId: string, peerId: string) => Promise<void>;
  onRetryMessage: (messageId: string) => void;
  disappearPolicy: DisappearPolicy;
  onSetDisappearPolicy: (policy: DisappearPolicy) => void;
  securityPrefs: SecurityPreferences;
  trustState: TrustState;
  activePeerKeyPreview: string | null;
  pendingPeerKeyPreview: string | null;
  sendBlockedReason: string | null;
  onMarkPeerVerified: () => void;
  onApprovePeerKeyChange: () => void;
};

const POLICIES: DisappearPolicy[] = ["5 min", "1 h", "24 h", "30 d"];

export function ChatScreen({
  route,
  routeMode,
  routeStatus,
  accent,
  chatMessages,
  callState,
  onSetRoute,
  onStartVoice,
  onStartVideo,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onSwitchRoute,
  onEndCall,
  initError,
  draft,
  onDraftChange,
  sending,
  onSendCurrentDraft,
  onRetryMessage,
  disappearPolicy,
  onSetDisappearPolicy,
  securityPrefs,
  trustState,
  activePeerKeyPreview,
  pendingPeerKeyPreview,
  sendBlockedReason,
  onMarkPeerVerified,
  onApprovePeerKeyChange,
}: ChatScreenProps) {
  const chatId = chatIdFromPeerId(route.params.peerId);
  const rColor = routeColor(routeMode);
  const effectiveError = sendBlockedReason ?? initError;
  const trustLabel =
    trustState === "verified" ? "Verified" : trustState === "changed_key" ? "Key Changed" : "Unverified";

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader
        title={route.params.peerName}
        subtitle={`${routeMode} - ${routeStatus.latencyMs}ms`}
        rightActionLabel="Call"
        onRightAction={onStartVoice}
        titleSize={22}
      />

      <RouteStrip route={routeMode} routeStatus={routeStatus} onSelectRoute={onSetRoute} />

      <View style={styles.securityBanner}>
        <Text style={styles.securityText}>E2EE Active</Text>
        <Text style={styles.securitySep}>|</Text>
        <Text style={styles.securityText}>Trust: {trustLabel}</Text>
        <Text style={styles.securitySep}>|</Text>
        <Text style={styles.securityText}>
          Screenshot: {securityPrefs.screenshotBlock ? "Blocked" : "Allowed"}
        </Text>
        <Text style={styles.securitySep}>|</Text>
        <Text style={styles.securityText}>Anti-delete: {securityPrefs.antiDelete ? "ON" : "Off"}</Text>
      </View>

      {activePeerKeyPreview ? <Text style={styles.keyText}>Key: {activePeerKeyPreview}</Text> : null}

      {trustState === "unverified" ? (
        <Pressable style={[styles.verifyButton, { borderColor: accent }]} onPress={onMarkPeerVerified}>
          <Text style={[styles.verifyButtonText, { color: accent }]}>Mark Key Verified</Text>
        </Pressable>
      ) : null}

      {trustState === "changed_key" ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Key change detected</Text>
          <Text style={styles.warningBody}>Incoming key: {pendingPeerKeyPreview ?? "N/A"}</Text>
          <Pressable style={[styles.verifyButton, { borderColor: COLORS.danger }]} onPress={onApprovePeerKeyChange}>
            <Text style={[styles.verifyButtonText, { color: COLORS.danger }]}>Approve New Key</Text>
          </Pressable>
        </View>
      ) : null}

      {callState.phase !== "idle" ? (
        <View style={[styles.callCard, { borderColor: glow(rColor, 0.3) }]}>
          <Text style={[styles.callPhase, { color: rColor }]}>
            {callState.phase === "connecting" ? "Connecting..." : `${callState.mode.toUpperCase()} active`}
          </Text>
          <CallControls
            callState={callState}
            onStartVoice={onStartVoice}
            onStartVideo={onStartVideo}
            onToggleMute={onToggleMute}
            onToggleCamera={onToggleCamera}
            onToggleSpeaker={onToggleSpeaker}
            onSwitchRoute={onSwitchRoute}
            onEndCall={onEndCall}
          />
        </View>
      ) : null}

      <View style={styles.messageList}>
        {chatMessages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>...</Text>
            <Text style={styles.emptyText}>Start the encrypted conversation.</Text>
          </View>
        ) : (
          chatMessages.map((message) => (
            <MessageBubble key={message.id} message={message} accent={accent} onRetry={onRetryMessage} />
          ))
        )}
      </View>

      <View style={styles.policyRow}>
        <Text style={styles.policyLabel}>Disappearing:</Text>
        {POLICIES.map((policy) => (
          <Pill
            key={policy}
            label={policy}
            color={accent}
            active={disappearPolicy === policy}
            onPress={() => onSetDisappearPolicy(policy)}
          />
        ))}
      </View>

      {effectiveError ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{effectiveError}</Text>
        </View>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          placeholder="Encrypted message..."
          placeholderTextColor={COLORS.textMuted}
          style={styles.composerInput}
        />
        <Pressable
          onPress={() => void onSendCurrentDraft(chatId, route.params.peerId)}
          disabled={Boolean(effectiveError) || sending}
          style={[styles.sendButton, { borderColor: accent }, (effectiveError || sending) ? styles.sendButtonDisabled : null]}
        >
          <Text style={[styles.sendButtonText, { color: accent }]}>Send</Text>
        </Pressable>
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
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0, 255, 136, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
  },
  securityText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  securitySep: {
    color: "rgba(255, 255, 255, 0.1)",
    fontSize: 11,
  },
  keyText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },
  verifyButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 255, 136, 0.05)",
  },
  verifyButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  warningCard: {
    borderWidth: 1,
    borderColor: "rgba(255, 75, 110, 0.4)",
    backgroundColor: "rgba(255, 75, 110, 0.08)",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  warningTitle: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  warningBody: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: "monospace",
  },
  callCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    backgroundColor: COLORS.glass,
  },
  callPhase: {
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 10,
  },
  messageList: {
    gap: 8,
    minHeight: 120,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 20,
    opacity: 0.4,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  policyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  policyLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  errorBar: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 46, 99, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 46, 99, 0.2)",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  composerInput: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.inputBg,
    color: COLORS.textPrimary,
    paddingHorizontal: 20,
    fontSize: 14,
  },
  sendButton: {
    height: 50,
    minWidth: 68,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 255, 136, 0.08)",
    paddingHorizontal: 14,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
