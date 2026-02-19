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
              borderColor: accent,
              shadowColor: glow(accent),
              shadowOpacity: 0.45,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
