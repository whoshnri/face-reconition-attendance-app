import React from "react";
import { StyleSheet, Pressable, Animated } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface CardProps {
  elevation: number;
  onPress?: () => void;
}

const springConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  useNativeDriver: true,
};

const getBackgroundColorForElevation = (
  elevation: number,
  theme: any,
): string => {
  switch (elevation) {
    case 1:
      return theme.backgroundDefault;
    case 2:
      return theme.backgroundSecondary;
    case 3:
      return theme.backgroundTertiary;
    default:
      return theme.backgroundRoot;
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ elevation, onPress }: CardProps) {
  const { theme } = useTheme();
  const scale = React.useRef(new Animated.Value(1)).current;

  const cardBackgroundColor = getBackgroundColorForElevation(elevation, theme);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      ...springConfig,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      ...springConfig,
    }).start();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          backgroundColor: cardBackgroundColor,
          transform: [{ scale }],
        },
      ]}
    >
      <ThemedText type="h4" style={styles.cardTitle}>
        Card - Elevation {elevation}
      </ThemedText>
      <ThemedText type="small" style={styles.cardDescription}>
        This card has an elevation of {elevation}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius["2xl"],
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    opacity: 0.7,
  },
});
