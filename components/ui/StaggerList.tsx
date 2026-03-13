import React from 'react';
import { ViewStyle } from 'react-native';

import { FadeInUp } from './FadeInUp';

const STAGGER_STEP = 50;

type StaggerListProps = {
  children: React.ReactNode[];
  stepDelay?: number;
  style?: ViewStyle | ViewStyle[];
};

export function StaggerList({
  children,
  stepDelay = STAGGER_STEP,
  style,
}: StaggerListProps) {
  return (
    <>
      {React.Children.map(children, (child, index) => (
        <FadeInUp key={index} delay={index * stepDelay} style={style}>
          {child}
        </FadeInUp>
      ))}
    </>
  );
}
