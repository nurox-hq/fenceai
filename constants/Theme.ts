import { Platform } from 'react-native';

/**
 * FENCEAI — дизайн-система 2026: мягкие скругления, карточки, отступы, тени, анимации.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 9999,
} as const;

/** Парящий таббар: форма и размеры */
export const tabBarFloating = {
  /** Отступ от низа экрана (над safe area). Больше = таббар выше. */
  bottom: 20,
  /** Отступ слева и справа — симметрично, таббар по центру */
  horizontal: 20,
  height: 74,
  borderRadius: 37,
  /** Нижний padding контента экранов */
  contentPaddingBottom: 135,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const },
  titleLarge: { fontSize: 28, fontWeight: '700' as const },
  headline: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
} as const;

/** Длительности анимаций (мс) */
export const timing = {
  instant: 0,
  fast: 120,
  normal: 200,
  slow: 320,
  verySlow: 480,
} as const;

/** Кривые для Reanimated */
export const easing = {
  ease: { x: 0.25, y: 0.1, width: 0.25, height: 1 },
  easeOut: { x: 0, y: 0, width: 0.33, height: 1 },
  easeInOut: { x: 0.65, y: 0, width: 0.35, height: 1 },
} as const;

/** Тени для карточек и кнопок (iOS/Android) */
export function getShadow(
  level: 'sm' | 'md' | 'lg',
  color: string = 'rgba(0,0,0,0.08)'
): Record<string, unknown> {
  if (Platform.OS === 'android') {
    const elevation = { sm: 2, md: 4, lg: 8 }[level];
    return { elevation };
  }
  const presets = {
    sm: { shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, shadowOpacity: 0.06 },
    md: { shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, shadowOpacity: 0.08 },
    lg: { shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, shadowOpacity: 0.12 },
  };
  return { ...presets[level], shadowColor: color };
}
