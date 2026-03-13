import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';

const springConfig: WithSpringConfig = {
  damping: 18,
  stiffness: 120,
  mass: 0.8,
};

type FadeInUpProps = {
  children: React.ReactNode;
  delay?: number;
  offset?: number;
  style?: ViewStyle | ViewStyle[];
};

export function FadeInUp({
  children,
  delay = 0,
  offset = 16,
  style,
}: FadeInUpProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(offset);

  useEffect(() => {
    opacity.value = withDelay(delay, withSpring(1, springConfig));
    translateY.value = withDelay(delay, withSpring(0, springConfig));
  }, [delay, offset, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
