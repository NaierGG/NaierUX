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
              borderColor: color,
              shadowColor: glow(color),
              shadowOpacity: 0.45,
              backgroundColor: "#101010",
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#131313",
    shadowOpacity: 0,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  pillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
});
