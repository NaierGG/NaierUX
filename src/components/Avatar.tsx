import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/tokens";

type AvatarProps = {
  label: string;
  size?: number;
  borderColor?: string;
  online?: boolean;
};

export function Avatar({
  label,
  size = 44,
  borderColor = COLORS.glassBorderHover,
  online = false,
}: AvatarProps) {
  const fontSize = size > 60 ? 24 : size > 36 ? 16 : 12;
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor,
          },
        ]}
      >
        <Text style={[styles.avatarText, { fontSize }]}>{label.slice(0, 1).toUpperCase()}</Text>
      </View>
      {online ? <View style={[styles.onlineDot, { borderColor: COLORS.bg0 }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
  },
  avatar: {
    borderWidth: 1.5,
    backgroundColor: COLORS.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accentMain,
    borderWidth: 2,
  },
});
