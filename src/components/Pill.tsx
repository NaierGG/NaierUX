import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { COLORS, glow } from "../theme/tokens";

type PillProps = {
  label: string;
  color: string;
  active?: boolean;
  onPress?: () => void;
};

export function Pill({ label, color, active = false, onPress }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        active
          ? {
            borderColor: glow(color, 0.4),
            backgroundColor: glow(color, 0.1),
            shadowColor: color,
            shadowOpacity: 0.2,
          }
          : null,
      ]}
    >
      <Text style={[styles.pillText, active ? { color } : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  pillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
});
