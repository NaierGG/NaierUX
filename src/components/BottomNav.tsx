import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/tokens";

export type BottomNavItem = "Chats" | "Contacts" | "Calls" | "Groups" | "Settings";

type BottomNavProps = {
  activeItem: BottomNavItem;
  accent: string;
  onNavigate: (item: BottomNavItem) => void;
};

const NAV_ITEMS: { key: BottomNavItem; icon: string }[] = [
  { key: "Chats", icon: "💬" },
  { key: "Contacts", icon: "👥" },
  { key: "Calls", icon: "📞" },
  { key: "Groups", icon: "🔗" },
  { key: "Settings", icon: "⚙" },
];

export function BottomNav({ activeItem, accent, onNavigate }: BottomNavProps) {
  return (
    <View style={styles.bottomNav}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeItem === item.key;
        return (
          <Pressable key={item.key} onPress={() => onNavigate(item.key)} style={styles.navItem}>
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[styles.navText, isActive ? { color: accent } : null]}>{item.key}</Text>
            {isActive ? <View style={[styles.activeDot, { backgroundColor: accent }]} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    height: 64,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    backgroundColor: "rgba(5, 6, 10, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 4,
  },
  navItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
  },
  navIcon: {
    fontSize: 18,
  },
  navText: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: -0.1,
    fontWeight: "600",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
