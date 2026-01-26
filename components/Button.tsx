import React, { ReactNode } from "react";
import {
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
  Animated,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const springConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  useNativeDriver: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  children,
  style,
  disabled = false,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      Animated.spring(scale, {
        toValue: 0.98,
        ...springConfig,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      Animated.spring(scale, {
        toValue: 1,
        ...springConfig,
      }).start();
    }
  };

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: theme.link,
          opacity: disabled ? 0.5 : 1,
        },
        style,
        { transform: [{ scale }] },
      ]}
    >
      <ThemedText
        type="body"
        style={[styles.buttonText, { color: theme.buttonText }]}
      >
        {children}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
});
