import React from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';

const springConfig: WithSpringConfig = {
  damping: 15,
  stiffness: 400,
  mass: 0.6,
};

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  scaleActive?: number;
  style?: ViewStyle | ViewStyle[];
};

export function PressableScale({
  children,
  scaleActive = 0.97,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withSpring(scaleActive, springConfig);
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, springConfig);
    onPressOut?.(e);
  };

  return (
    <Pressable
      style={style}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}
