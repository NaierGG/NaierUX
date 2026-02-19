import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CallState } from "../core";
import { COLORS, glow, routeColor } from "../theme/tokens";

type CallControlsProps = {
  callState: CallState;
  onStartVoice: () => void;
  onStartVideo: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onSwitchRoute: () => void;
  onEndCall: () => void;
};

export function CallControls({
  callState,
  onStartVoice,
  onStartVideo,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onSwitchRoute,
  onEndCall,
}: CallControlsProps) {
  const rColor = routeColor(callState.route);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onStartVoice} style={styles.pill}>
        <Text style={styles.icon}>🎤</Text>
        <Text style={styles.text}>Voice</Text>
      </Pressable>
      <Pressable onPress={onStartVideo} style={styles.pill}>
        <Text style={styles.icon}>📹</Text>
        <Text style={styles.text}>Video</Text>
      </Pressable>
      <Pressable
        onPress={onToggleMute}
        style={[styles.pill, callState.muted ? styles.activePill : null]}
      >
        <Text style={styles.icon}>🔇</Text>
        <Text style={[styles.text, callState.muted ? styles.activeText : null]}>
          {callState.muted ? "Unmute" : "Mute"}
        </Text>
      </Pressable>
      <Pressable
        onPress={onToggleCamera}
        style={[styles.pill, !callState.cameraEnabled ? styles.activePill : null]}
      >
        <Text style={styles.icon}>📷</Text>
        <Text style={[styles.text, !callState.cameraEnabled ? styles.activeText : null]}>
          {callState.cameraEnabled ? "Cam" : "Cam Off"}
        </Text>
      </Pressable>
      <Pressable onPress={onToggleSpeaker} style={styles.pill}>
        <Text style={styles.icon}>🔊</Text>
        <Text style={styles.text}>{callState.speakerEnabled ? "Spkr" : "Spkr Off"}</Text>
      </Pressable>
      <Pressable
        onPress={onSwitchRoute}
        style={[styles.pill, { borderColor: glow(rColor, 0.3) }]}
      >
        <Text style={styles.icon}>🔀</Text>
        <Text style={[styles.text, { color: rColor }]}>Route</Text>
      </Pressable>
      <Pressable onPress={onEndCall} style={[styles.pill, styles.endPill]}>
        <Text style={styles.icon}>✕</Text>
        <Text style={[styles.text, styles.endText]}>End</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activePill: {
    borderColor: COLORS.accentMain,
    backgroundColor: "rgba(0, 255, 136, 0.08)",
  },
  icon: {
    fontSize: 14,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  activeText: {
    color: COLORS.accentMain,
  },
  endPill: {
    borderColor: COLORS.danger,
  },
  endText: {
    color: COLORS.danger,
  },
});
