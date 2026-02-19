import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/tokens";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  titleSize?: number;
  rightActionLabel?: string;
  onRightAction?: () => void;
};

export function AppHeader({
  title,
  subtitle,
  titleSize = 26,
  rightActionLabel,
  onRightAction,
}: AppHeaderProps) {
  const titleVariantStyle = titleSize <= 20 ? styles.headerTitleSm : titleSize <= 22 ? styles.headerTitleMd : styles.headerTitleLg;
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerMeta}>
        <Text style={[styles.headerTitle, titleVariantStyle]}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightActionLabel ? (
        <Pressable onPress={onRightAction} style={styles.actionButton}>
          <Text style={styles.actionText}>{rightActionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  headerMeta: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerTitleLg: {
    fontSize: 26,
  },
  headerTitleMd: {
    fontSize: 22,
  },
  headerTitleSm: {
    fontSize: 20,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: COLORS.accentCyber,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#0F0F0F",
  },
  actionText: {
    color: COLORS.accentCyber,
    fontSize: 12,
    fontWeight: "600",
  },
});
