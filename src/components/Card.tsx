import React from "react";
import { StyleSheet, View } from "react-native";
import { COLORS, glow } from "../theme/tokens";

type CardProps = {
  children: React.ReactNode;
  accent?: string;
};

export function Card({ children, accent }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        accent
          ? {
            borderColor: glow(accent, 0.25),
            shadowColor: accent,
            shadowOpacity: 0.2,
          }
          : null,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    shadowOpacity: 0,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});
