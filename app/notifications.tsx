import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { spacing, radius, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';

export default function NotificationsScreen() {
  const theme = useColorScheme();
  const c = Colors[theme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptic = useHaptic();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <PressableScale
          style={[styles.headerBtn, { backgroundColor: c.surface }]}
          onPress={() => {
            haptic.light();
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </PressableScale>
        <Text style={[styles.headerTitle, { color: c.text }]}>Уведомления</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <FadeInUp delay={0}>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="notifications-outline" size={26} color={c.text} />
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: c.text }]}>
                Визуализация готова
              </Text>
              <Text style={[styles.cardSub, { color: c.textSecondary }]}>
                Когда AI‑визуализация будет доступна, здесь появится уведомление с ссылкой на проект.
              </Text>
            </View>
          </View>
        </FadeInUp>

        <FadeInUp delay={80}>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="construct-outline" size={26} color={c.text} />
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: c.text }]}>
                Обновления по проектам
              </Text>
              <Text style={[styles.cardSub, { color: c.textSecondary }]}>
                Здесь будут уведомления о новых проектах, изменениях статуса и комментариях.
              </Text>
            </View>
          </View>
        </FadeInUp>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleLarge,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  cardText: { flex: 1 },
  cardTitle: {
    ...typography.body,
    fontSize: 16,
    marginBottom: 2,
  },
  cardSub: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
});

