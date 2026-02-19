import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import type { CallState, RouteMode, RouteStatus } from "../core";
import { COLORS, glow, routeColor } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Avatar } from "../components/Avatar";
import { CallControls } from "../components/CallControls";

export type CallScreenProps = NativeStackScreenProps<RootStackParamList, "Call"> & {
  routeMode: RouteMode;
  routeStatus: RouteStatus;
  accent: string;
  callState: CallState;
  onStartVoice: () => void;
  onStartVideo: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onSwitchRoute: () => void;
  onEndCall: () => void;
};

function formatDuration(sec: number): string {
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function CallScreen({
  route,
  routeMode,
  routeStatus,
  accent,
  callState,
  onStartVoice,
  onStartVideo,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onSwitchRoute,
  onEndCall,
}: CallScreenProps) {
  const rColor = routeColor(callState.route);
  const phaseLabel =
    callState.phase === "idle"
      ? "Ready"
      : callState.phase === "connecting"
        ? "Connecting..."
        : `${callState.mode.toUpperCase()} • ${formatDuration(callState.durationSec)}`;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Caller */}
      <View style={styles.callerSection}>
        <Avatar label={route.params.peerId} size={80} borderColor={rColor} />
        <Text style={styles.peerName}>{route.params.peerId}</Text>
        <Text style={[styles.phaseLabel, { color: rColor }]}>{phaseLabel}</Text>
      </View>

      {/* Quality */}
      <View style={[styles.qualityCard, { borderColor: glow(rColor, 0.2) }]}>
        <Text style={styles.qualityTitle}>Call Quality</Text>
        <View style={styles.qualityRow}>
          <View style={styles.qualityItem}>
            <Text style={[styles.qualityValue, { color: rColor }]}>{callState.bars}/5</Text>
            <Text style={styles.qualityLabel}>Bars</Text>
          </View>
          <View style={styles.qualityItem}>
            <Text style={[styles.qualityValue, { color: rColor }]}>{callState.latencyMs}ms</Text>
            <Text style={styles.qualityLabel}>Latency</Text>
          </View>
          <View style={styles.qualityItem}>
            <Text style={styles.qualityValue}>{callState.jitterMs}ms</Text>
            <Text style={styles.qualityLabel}>Jitter</Text>
          </View>
          <View style={styles.qualityItem}>
            <Text style={styles.qualityValue}>{callState.packetLossPct.toFixed(1)}%</Text>
            <Text style={styles.qualityLabel}>Loss</Text>
          </View>
        </View>
        <Text style={styles.routeInfo}>Route: {callState.route} • Encrypted</Text>
      </View>

      {/* Controls */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 20,
    alignItems: "center",
  },
  callerSection: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  peerName: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "600",
    marginTop: 8,
  },
  phaseLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  qualityCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    backgroundColor: COLORS.glass,
  },
  qualityTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  qualityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  qualityItem: {
    alignItems: "center",
    gap: 4,
  },
  qualityValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  qualityLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routeInfo: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 12,
    textAlign: "center",
  },
});
