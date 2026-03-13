import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { FadeIn } from '@/components/ui/FadeIn';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { getShadow, radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';

export default function VisualizeVideoScreen() {
  const { uri, fenceId } = useLocalSearchParams<{ uri: string; fenceId: string }>();
  const [generating, setGenerating] = useState(true);
  const theme = useColorScheme();
  const c = Colors[theme];
  const haptic = useHaptic();
  const pulse = useSharedValue(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setGenerating(false);
      haptic.success();
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (generating) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1);
    }
  }, [generating, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const downloadVideo = () => haptic.medium();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border },
          getShadow('md') as object,
        ]}
      >
        {generating ? (
          <FadeIn>
            <Animated.View style={[styles.generatingWrap, pulseStyle]}>
              <View style={[styles.spinnerDot, { backgroundColor: c.tint }]} />
            </Animated.View>
            <Text style={[styles.status, { color: c.text }]}>Генерация видеооблёта...</Text>
            <Text style={[styles.hint, { color: c.textSecondary }]}>
              ИИ создаёт облёт вокруг участка по визуализации. После интеграции с API здесь будет реальная генерация.
            </Text>
          </FadeIn>
        ) : (
          <>
            <FadeInUp delay={0}>
              <View style={[styles.placeholder, { backgroundColor: c.border }]}>
                <Text style={[styles.placeholderText, { color: c.textSecondary }]}>
                  Видео (плейсхолдер)
                </Text>
              </View>
            </FadeInUp>
            <FadeInUp delay={80}>
              <Text style={[styles.status, { color: c.text }]}>Готово</Text>
              <Text style={[styles.hint, { color: c.textSecondary }]}>
                Сохраните видео или отправьте ссылку клиенту.
              </Text>
              <PressableScale
                style={[styles.primaryBtn, { backgroundColor: c.tint }, getShadow('sm') as object]}
                onPress={downloadVideo}
              >
                <Text style={styles.primaryBtnText}>Скачать видео</Text>
              </PressableScale>
            </FadeInUp>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingWrap: { marginBottom: spacing.lg },
  spinnerDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  status: { ...typography.headline, marginBottom: spacing.sm },
  hint: { ...typography.bodySmall, textAlign: 'center', marginBottom: spacing.xl },
  placeholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  placeholderText: { ...typography.body },
  primaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  primaryBtnText: { color: '#fff', ...typography.label },
});
