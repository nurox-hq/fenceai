import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';

import { useHaptic } from '@/hooks/useHaptic';

const springConfig: WithSpringConfig = {
  damping: 18,
  stiffness: 400,
  mass: 0.5,
};

type FloatingTabBarButtonProps = PressableProps & {
  children: React.ReactNode;
};

export function FloatingTabBarButton({ children, onPress, style, ...rest }: FloatingTabBarButtonProps) {
  const scale = useSharedValue(1);
  const haptic = useHaptic();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.88, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = (e: any) => {
    haptic.light();
    onPress?.(e);
  };

  return (
    <Pressable
      style={style}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...rest}
    >
      <Animated.View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
