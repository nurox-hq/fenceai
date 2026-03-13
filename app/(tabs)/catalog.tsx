import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { PressableScale } from '@/components/ui/PressableScale';
import { StaggerList } from '@/components/ui/StaggerList';
import Colors from '@/constants/Colors';
import { getShadow, radius, spacing, tabBarFloating, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';

const CATALOG = [
  { id: '1', name: 'Кованый', desc: 'Кованые элементы, премиум' },
  { id: '2', name: 'Дерево', desc: 'Штакетник, доска' },
  { id: '3', name: 'Металлосайдинг', desc: 'Профлист, металл' },
  { id: '4', name: 'Сетка', desc: 'Рабица, 3D-сетка' },
  { id: '5', name: 'Камень / Кирпич', desc: 'Столбы и секции' },
  { id: '6', name: 'Живая изгородь', desc: 'Комбинированные варианты' },
];

export default function CatalogScreen() {
  const theme = useColorScheme();
  const c = Colors[theme];
  const haptic = useHaptic();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarFloating.contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <FadeInUp delay={0}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            Типы ограждений
          </Text>
        </FadeInUp>
        <View style={styles.grid}>
          <StaggerList stepDelay={45} style={styles.gridItemWrap}>
            {CATALOG.map((item) => (
              <PressableScale
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: c.cardBg,
                    borderColor: c.border,
                    ...getShadow('sm') as object,
                  },
                ]}
                onPress={() => haptic.light()}
              >
                <View style={[styles.cardImage, { backgroundColor: c.border }]} />
                <Text style={[styles.cardTitle, { color: c.text }]}>{item.name}</Text>
                <Text style={[styles.cardDesc, { color: c.textSecondary }]}>
                  {item.desc}
                </Text>
              </PressableScale>
            ))}
          </StaggerList>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  sectionTitle: { ...typography.headline, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItemWrap: { width: '47%' },
  card: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    paddingBottom: spacing.md,
  },
  cardImage: { height: 100, width: '100%', borderRadius: 0 },
  cardTitle: { ...typography.headline, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  cardDesc: { ...typography.caption, paddingHorizontal: spacing.md, marginTop: 2 },
});
