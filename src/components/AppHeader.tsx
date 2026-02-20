import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/tokens";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  titleSize?: number;
  rightActionLabel?: string;
  onRightAction?: () => void;
  onBack?: () => void;
};

export function AppHeader({
  title,
  subtitle,
  titleSize = 26,
  rightActionLabel,
  onRightAction,
  onBack,
}: AppHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>{"<"}</Text>
          </Pressable>
        ) : null}
        <View style={styles.headerMeta}>
          <Text style={[styles.headerTitle, { fontSize: titleSize }]}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
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
    paddingVertical: 4,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerMeta: {
    flex: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: -1,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 3,
    letterSpacing: -0.1,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: COLORS.glassBorderHover,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.glass,
  },
  actionText: {
    color: COLORS.accentMain,
    fontSize: 12,
    fontWeight: "600",
  },
});
