import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { getShadow, radius, spacing, tabBarFloating, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';

export default function VisualizeScreen() {
  const theme = useColorScheme();
  const c = Colors[theme];
  const router = useRouter();
  const haptic = useHaptic();

  const openCamera = () => {
    haptic.light();
    router.push('/visualize-upload?source=camera');
  };
  const openGallery = () => {
    haptic.light();
    router.push('/visualize-upload?source=gallery');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingBottom: tabBarFloating.contentPaddingBottom }]}>
      <FadeInUp delay={0}>
        <View style={[styles.hero, { backgroundColor: c.surface }]}>
          <Text style={[styles.heroTitle, { color: c.text }]}>
            Визуализация забора
          </Text>
          <Text style={[styles.heroSub, { color: c.textSecondary }]}>
            Сфотографируйте участок или загрузите фото — ИИ добавит выбранный забор для превью и создаст видеооблёт.
          </Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={80}>
        <PressableScale
          style={[
            styles.card,
            { backgroundColor: c.cardBg, borderColor: c.border, ...getShadow('sm') as object },
          ]}
          onPress={openCamera}
        >
          <Text style={[styles.cardTitle, { color: c.text }]}>Снять фото</Text>
          <Text style={[styles.cardSub, { color: c.textSecondary }]}>Камера</Text>
        </PressableScale>
      </FadeInUp>
      <FadeInUp delay={120}>
        <PressableScale
          style={[
            styles.card,
            { backgroundColor: c.cardBg, borderColor: c.border, ...getShadow('sm') as object },
          ]}
          onPress={openGallery}
        >
          <Text style={[styles.cardTitle, { color: c.text }]}>
            Выбрать из галереи
          </Text>
          <Text style={[styles.cardSub, { color: c.textSecondary }]}>
            Фото участка
          </Text>
        </PressableScale>
      </FadeInUp>

      <FadeInUp delay={180}>
        <View style={[styles.tip, { backgroundColor: c.surfaceElevated }]}>
          <Text style={[styles.tipText, { color: c.textSecondary }]}>
            Для лучшего результата снимайте участок так, чтобы был виден периметр, где планируется забор.
          </Text>
        </View>
      </FadeInUp>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  hero: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  heroTitle: { ...typography.title, marginBottom: spacing.sm },
  heroSub: { ...typography.bodySmall, lineHeight: 22 },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardTitle: { ...typography.headline, marginBottom: 4 },
  cardSub: { ...typography.bodySmall },
  tip: {
    padding: spacing.md,
    borderRadius: radius.md,
  },
  tipText: { ...typography.caption, lineHeight: 18 },
});
