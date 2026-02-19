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
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#050810",
    fontSize: 11,
    fontWeight: "800",
  },
});
