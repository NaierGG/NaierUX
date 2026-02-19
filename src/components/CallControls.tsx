import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CallState } from "../core";
import { COLORS, routeColor } from "../theme/tokens";

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
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onStartVoice} style={styles.pill}>
        <Text style={styles.text}>Start Voice</Text>
      </Pressable>
      <Pressable onPress={onStartVideo} style={styles.pill}>
        <Text style={styles.text}>Start Video</Text>
      </Pressable>
      <Pressable onPress={onToggleMute} style={styles.pill}>
        <Text style={styles.text}>{callState.muted ? "Unmute" : "Mute"}</Text>
      </Pressable>
      <Pressable onPress={onToggleCamera} style={styles.pill}>
        <Text style={styles.text}>{callState.cameraEnabled ? "Camera" : "Camera Off"}</Text>
      </Pressable>
      <Pressable onPress={onToggleSpeaker} style={styles.pill}>
        <Text style={styles.text}>{callState.speakerEnabled ? "Speaker" : "Speaker Off"}</Text>
      </Pressable>
      <Pressable onPress={onSwitchRoute} style={[styles.pill, { borderColor: routeColor(callState.route) }]}>
        <Text style={[styles.text, { color: routeColor(callState.route) }]}>Switch Route</Text>
      </Pressable>
      <Pressable onPress={onEndCall} style={[styles.pill, styles.endPill]}>
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
    borderColor: "#2A2A2A",
    backgroundColor: "#131313",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  endPill: {
    borderColor: COLORS.danger,
  },
  endText: {
    color: COLORS.danger,
  },
});
