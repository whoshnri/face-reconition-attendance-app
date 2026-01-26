import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  ViewStyle,
  StyleProp,
} from "react-native";

interface AnimatedPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const PressableComponent = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  style,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (event: any) => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      damping: 15,
      mass: 0.3,
      stiffness: 150,
    }).start();
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      mass: 0.3,
      stiffness: 150,
    }).start();
    onPressOut?.(event);
  };

  return (
    <PressableComponent
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}
