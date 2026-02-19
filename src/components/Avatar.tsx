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
  borderColor = COLORS.accentCyber,
  online = false,
}: AvatarProps) {
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
        <Text style={styles.avatarText}>{label.slice(0, 1).toUpperCase()}</Text>
      </View>
      {online ? <View style={styles.onlineDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
  },
  avatar: {
    borderWidth: 1,
    backgroundColor: "#0F0F0F",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accentMain,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
});
