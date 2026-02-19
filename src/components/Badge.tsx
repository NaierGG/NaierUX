import React from "react";
import { StyleSheet, Text, View } from "react-native";

type BadgeProps = {
  label: string | number;
  backgroundColor: string;
};

export function Badge({ label, backgroundColor }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "700",
  },
});
