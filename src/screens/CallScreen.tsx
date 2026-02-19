import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CallState } from "../core";
import type { RootStackParamList } from "../navigation/types";
import { COLORS, routeColor } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { CallControls } from "../components/CallControls";
import { Card } from "../components/Card";

export type CallScreenProps = NativeStackScreenProps<RootStackParamList, "Call"> & {
  callState: CallState;
  onStartSecureCall: (peerId: string, mode: "voice" | "video") => Promise<void>;
  onEndSecureCall: () => Promise<void>;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onSwitchRoute: () => void;
};

function formatDuration(durationSec: number): string {
  const minutes = Math.floor(durationSec / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (durationSec % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function CallScreen({
  route,
  callState,
  onStartSecureCall,
  onEndSecureCall,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onSwitchRoute,
}: CallScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="Call" subtitle={`${route.params.peerId} | ${callState.route}`} titleSize={22} />
      <Card accent={routeColor(callState.route)}>
        <Text style={styles.largeLabel}>
          {callState.phase === "connected" ? `${callState.mode.toUpperCase()} call active` : "Route Quality"}
        </Text>
        <Text style={styles.body}>
          {callState.phase} | {callState.latencyMs}ms | bars {callState.bars}/5
        </Text>
        <Text style={styles.small}>
          jitter {callState.jitterMs}ms | loss {callState.packetLossPct.toFixed(1)}% | duration{" "}
          {formatDuration(callState.durationSec)}
        </Text>
        <Text style={styles.small}>
          {callState.encrypted ? "Encrypted channel ready" : "Encryption inactive"}
        </Text>
      </Card>
      <View style={styles.callStage}>
        <Text style={styles.body}>
          {callState.phase === "connected" ? `${callState.mode.toUpperCase()} stream` : "Call preview area"}
        </Text>
      </View>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  largeLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
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
  callStage: {
    minHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#202020",
    backgroundColor: "#090909",
    alignItems: "center",
    justifyContent: "center",
  },
});
