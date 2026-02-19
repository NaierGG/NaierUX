import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/tokens";

export type BottomNavItem = "Chats" | "Contacts" | "Calls" | "Groups" | "Settings";

type BottomNavProps = {
  activeItem: BottomNavItem;
  accent: string;
  onNavigate: (item: BottomNavItem) => void;
};

const NAV_ITEMS: BottomNavItem[] = ["Chats", "Contacts", "Calls", "Groups", "Settings"];

export function BottomNav({ activeItem, accent, onNavigate }: BottomNavProps) {
  return (
    <View style={styles.bottomNav}>
      {NAV_ITEMS.map((item) => (
        <Pressable key={item} onPress={() => onNavigate(item)} style={styles.navItem}>
          <Text style={[styles.navText, activeItem === item ? { color: accent } : null]}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    minHeight: 62,
    borderTopWidth: 1,
    borderTopColor: "#161616",
    backgroundColor: "#000000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  navItem: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  navText: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: -0.1,
    fontWeight: "600",
  },
});
