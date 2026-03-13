import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { getShadow, radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';

const FENCE_NAMES: Record<string, string> = {
  forged: 'Кованый',
  wood: 'Дерево',
  metal: 'Металлосайдинг',
  mesh: 'Сетка',
  stone: 'Камень / Кирпич',
};

export default function VisualizePreviewScreen() {
  const { uri, fenceId } = useLocalSearchParams<{ uri: string; fenceId: string }>();
  const theme = useColorScheme();
  const c = Colors[theme];
  const router = useRouter();
  const haptic = useHaptic();

  const openVideoFlow = () => {
    haptic.medium();
    router.push({
      pathname: '/visualize-video',
      params: { uri: uri || '', fenceId: fenceId || '' },
    });
  };

  const saveProject = () => haptic.light();

  if (!uri) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.textSecondary }]}>Нет изображения</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FadeInUp delay={0}>
        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
            getShadow('md') as object,
          ]}
        >
          <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          <View style={[styles.overlay, { backgroundColor: c.heroOverlay }]}>
            <Text style={styles.overlayText}>
              Превью: забор «{FENCE_NAMES[fenceId] || fenceId}»
            </Text>
            <Text style={styles.overlayHint}>
              ИИ-визуализация будет подставлена при интеграции с бэкендом
            </Text>
          </View>
        </View>
      </FadeInUp>

      <FadeInUp delay={80}>
        <View style={[styles.tip, { backgroundColor: c.surfaceElevated }]}>
          <Text style={[styles.tipText, { color: c.textSecondary }]}>
            Здесь отображается участок с наложенным выбранным забором. Сохраните в проект или создайте видеооблёт.
          </Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={120}>
        <PressableScale
          style={[styles.primaryBtn, { backgroundColor: c.tint }, getShadow('sm') as object]}
          onPress={openVideoFlow}
        >
          <Text style={styles.primaryBtnText}>Создать видеооблёт</Text>
        </PressableScale>
      </FadeInUp>
      <FadeInUp delay={160}>
        <PressableScale style={[styles.secondaryBtn, { borderColor: c.border }]} onPress={saveProject}>
          <Text style={[styles.secondaryBtnText, { color: c.text }]}>Сохранить в проект</Text>
        </PressableScale>
      </FadeInUp>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: spacing.md },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  image: { width: '100%', aspectRatio: 4 / 3 },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  overlayText: { color: '#fff', ...typography.headline },
  overlayHint: { color: 'rgba(255,255,255,0.8)', ...typography.caption, marginTop: 4 },
  tip: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  tipText: { ...typography.bodySmall, lineHeight: 20 },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryBtnText: { color: '#fff', ...typography.label },
  secondaryBtn: {
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: { ...typography.label },
  error: { ...typography.body },
});
