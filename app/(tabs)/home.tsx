import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { getShadow, radius, spacing, tabBarFloating, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';
import { useWeather } from '@/hooks/useWeather';
import { ObjectsMapView } from '@/components/map/ObjectsMapView';

const FILTERS = [
  { id: 'viz', label: 'AI-Гид' },
  { id: 'map', label: 'Карта объектов' },
];

export default function HomeScreen() {
  const theme = useColorScheme();
  const c = Colors[theme];
  const router = useRouter();
  const haptic = useHaptic();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('viz');
  const [mapFullscreenVisible, setMapFullscreenVisible] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const searchPillProgress = useSharedValue(0);
  const SEARCH_PILL_WIDTH = 220;
  const { icon: weatherIcon, tempFormatted: weatherTemp, loading: weatherLoading } = useWeather();
  const userName = 'Максим';

  useEffect(() => {
    if (searchExpanded) {
      searchPillProgress.value = withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      searchPillProgress.value = withTiming(0, {
        duration: 220,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [searchExpanded]);

  const searchPillAnimatedStyle = useAnimatedStyle(() => ({
    width: 44 + (SEARCH_PILL_WIDTH - 44) * searchPillProgress.value,
  }));

  const goSearch = () => {
    haptic.light();
    setSearchExpanded(true);
  };
  const collapseSearch = () => setSearchExpanded(false);

  const openAssistant = () => {
    haptic.light();
    router.push('/assistant');
  };
  const goProjects = () => {
    haptic.light();
    router.push('/(tabs)/projects');
  };
  const openWeather = () => {
    haptic.light();
    router.push('/weather');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.homeBackground }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.md, paddingBottom: tabBarFloating.contentPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Верх: приветствие + имя слева, погода справа */}
        <FadeInUp delay={0}>
          <View style={styles.headerRow}>
            <Text style={[styles.greetingLine, { color: c.tabBarBg }]}>
              Привет, {userName} 👋
            </Text>
            <View style={styles.weatherBlock}>
              <PressableScale
                style={[styles.weatherCircle, { backgroundColor: c.surface }, getShadow('sm') as object]}
                onPress={openWeather}
              >
                <Ionicons name={weatherIcon} size={28} color={c.tabBarBg} />
              </PressableScale>
              <View style={styles.weatherText}>
                <Text style={[styles.weatherLabel, { color: c.textSecondary }]}>Погода</Text>
                <Text style={[styles.weatherTemp, { color: c.tabBarBg }]} numberOfLines={1}>
                  {weatherLoading ? '…' : weatherTemp}
                </Text>
              </View>
            </View>
          </View>
        </FadeInUp>

        {/* Заголовок + поиск */}
        <FadeInUp delay={80}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: c.tabBarBg }]} numberOfLines={2}>
              Визуализация{'\n'}заборов
            </Text>
            <PressableScale
              onPress={() => {
                if (searchExpanded) searchInputRef.current?.focus();
                else goSearch();
              }}
              style={styles.searchTrigger}
            >
              <Animated.View
                style={[
                  styles.searchPillWrap,
                  { backgroundColor: c.surface },
                  getShadow('sm') as object,
                  searchPillAnimatedStyle,
                ]}
              >
                <View style={styles.searchPillInner}>
                  <View style={styles.searchPillIconBox}>
                    <Ionicons name="search" size={22} color={c.tabBarBg} />
                  </View>
                  <TextInput
                    ref={searchInputRef}
                    style={[styles.searchPillInput, { color: c.text }]}
                    placeholder="Найти"
                    placeholderTextColor={c.textSecondary}
                    onBlur={collapseSearch}
                    returnKeyType="search"
                  />
                </View>
              </Animated.View>
            </PressableScale>
          </View>
        </FadeInUp>

        {/* Круг под фильтрами: при «Карта объектов» — карта, при «AI‑Гид» — кнопка ассистента */}
        <FadeInUp delay={140}>
          <View style={styles.circleWrap}>
            {activeFilter === 'map' ? (
              <PressableScale
                style={[styles.circle, styles.circleMap]}
                onPress={() => {
                  haptic.light();
                  setMapFullscreenVisible(true);
                }}
              >
                <View style={styles.circleMapGlow} />
                <View style={styles.circleMapPlaceholder}>
                  <View style={[styles.mapMarker, styles.mapMarker1]} />
                  <View style={[styles.mapMarker, styles.mapMarker2]} />
                  <View style={[styles.mapMarker, styles.mapMarker3]} />
                  <View style={[styles.mapMarker, styles.mapMarker4]} />
                  <View style={[styles.mapMarker, styles.mapMarker5]} />
                  <Ionicons name="map" size={56} color="rgba(210,233,213,0.5)" />
                  <Text style={styles.circleMapHint}>Нажмите для карты</Text>
                </View>
              </PressableScale>
            ) : (
              <PressableScale
                style={[styles.circle, { backgroundColor: '#69C5F8' }]}
                onPress={openAssistant}
              >
                <View style={styles.circleMapPlaceholder}>
                  <Ionicons name="sparkles-outline" size={56} color="#FFFFFF" />
                  <Text style={styles.circleMapHint}>AI‑ассистент FenceAI</Text>
                </View>
              </PressableScale>
            )}
          </View>
        </FadeInUp>

        {/* Чипы фильтров — поверх круга */}
        <FadeInUp delay={120}>
          <View style={styles.chipsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {FILTERS.map((f) => (
                <PressableScale
                  key={f.id}
                  style={[
                    styles.chip,
                    activeFilter === f.id
                      ? { backgroundColor: c.tabBarBg }
                      : { backgroundColor: c.surface, borderColor: c.border },
                  ]}
                  onPress={() => {
                    haptic.light();
                    setActiveFilter(f.id);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: activeFilter === f.id ? '#fff' : c.text },
                    ]}
                  >
                    {f.label}
                  </Text>
                </PressableScale>
              ))}
            </ScrollView>
          </View>
        </FadeInUp>

        {/* Нижний блок пока убран по требованиям дизайна */}
      </ScrollView>

      <Modal visible={mapFullscreenVisible} animationType="slide" onRequestClose={() => setMapFullscreenVisible(false)}>
        <View style={[styles.mapFullscreen, { backgroundColor: c.background }]}>
          <View style={[styles.mapFullscreenHeader, { borderBottomColor: c.border }]}>
            <PressableScale
              style={[styles.searchCapsule, { backgroundColor: c.surface }]}
              onPress={() => { haptic.light(); setMapFullscreenVisible(false); }}
            >
              <Ionicons name="close" size={24} color={c.text} />
            </PressableScale>
            <Text style={[styles.mapFullscreenTitle, { color: c.text }]}>Карта объектов</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.mapFullscreenContent}>
            <ObjectsMapView />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_OVERFLOW = 40;
const CIRCLE_SIZE = SCREEN_WIDTH + CIRCLE_OVERFLOW;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  greetingLine: { ...typography.title, fontSize: 22 },
  weatherBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weatherCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherText: { alignItems: 'flex-end' },
  weatherLabel: { ...typography.caption },
  weatherTemp: { ...typography.headline, fontSize: 16 },
  location: { ...typography.caption, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: { ...typography.titleLarge, flex: 1 },
  searchTrigger: { flexShrink: 0 },
  searchPillWrap: {
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  searchPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  searchPillIconBox: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPillInput: {
    flex: 1,
    minWidth: 0,
    ...typography.body,
    fontSize: 16,
    paddingVertical: 0,
    paddingRight: 14,
  },
  chipsWrapper: { zIndex: 1, marginTop: -(CIRCLE_SIZE + spacing.lg + 18) },
  chipsRow: { gap: spacing.sm, marginBottom: spacing.lg, paddingRight: spacing.md },
  chip: {
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { ...typography.label },
  circleWrap: {
    position: 'relative',
    zIndex: 0,
    marginTop: 20,
    marginBottom: spacing.lg,
    marginHorizontal: -CIRCLE_OVERFLOW / 2,
    alignItems: 'center',
    justifyContent: 'center',
    height: CIRCLE_SIZE,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#D2E9D5',
  },
  circleMap: {
    backgroundColor: '#2a2d32',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(210,233,213,0.35)',
    shadowColor: '#D2E9D5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  circleMapGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(210,233,213,0.2)',
  },
  circleMapPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleMapHint: {
    ...typography.caption,
    marginTop: spacing.sm,
    color: 'rgba(210,233,213,0.7)',
  },
  mapMarker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(210,233,213,0.9)',
    borderWidth: 2,
    borderColor: 'rgba(42,45,50,0.8)',
  },
  mapMarker1: { top: '28%', left: '32%' },
  mapMarker2: { top: '45%', left: '58%' },
  mapMarker3: { top: '62%', left: '25%' },
  mapMarker4: { top: '38%', left: '72%' },
  mapMarker5: { top: '55%', left: '48%' },
  mapFullscreen: { flex: 1 },
  mapFullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  mapFullscreenTitle: { ...typography.headline, fontSize: 18 },
  mapFullscreenContent: { flex: 1 },
  mapFullscreenPlaceholder: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFullscreenHint: { ...typography.body, marginTop: spacing.sm },
  bottomCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  bottomCardTitle: { ...typography.headline, marginBottom: spacing.xs },
  bottomCardSub: { ...typography.bodySmall, marginBottom: spacing.md },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  linkBtnText: { ...typography.label },
});
