import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useState } from 'react';
import { Dimensions, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  type SharedValue,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { getShadow, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';
import { useWeather } from '@/hooks/useWeather';

const WEATHER_BG = require('@/assets/weather/sun.png');

/** Сдвиг фоновой картинки вверх — чем больше, тем больше картинки над кругом */
const BG_IMAGE_OFFSET_UP = 200;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
/** Верх круга — заметно выше середины, чуть опущен */
const CIRCLE_TOP = SCREEN_HEIGHT * 0.36;
/** Радиус такой, чтобы круг закрывал нижние углы экрана (центр по горизонтали, верх в CIRCLE_TOP) */
const CIRCLE_RADIUS =
  (Math.pow(SCREEN_WIDTH / 2, 2) + Math.pow(SCREEN_HEIGHT - CIRCLE_TOP, 2)) /
  (2 * (SCREEN_HEIGHT - CIRCLE_TOP)) +
  24;
const CIRCLE_SIZE = CIRCLE_RADIUS * 2;

/** Цвет круга: белый */
const CIRCLE_COLOR = '#FFFFFF';
/** Цвет плашек по дуге */
const RIBBON_PILL_COLOR = '#CDFF07';
/** Цвет панели под ветром */
const TOP_BAR_COLOR = '#F1F4F9';

/** Плашки по верхней дуге: 7 в поле зрения, центр — одна увеличенная */
const PILL_WIDTH = 44;
const PILL_HEIGHT = 100;
const PILL_WIDTH_CENTER = 52;
const PILL_HEIGHT_CENTER = 116;

/** Фиксированный отступ между плашками (px) */
const GAP_PX = 3;

/** Радиус дуги, по которой стоят плашки (внутри круга) */
const RIBBON_ARC_RADIUS = CIRCLE_RADIUS - PILL_HEIGHT_CENTER / 2 - 12;

/** Горизонтальный скруглённый блок под плашками (цвет как у плашек) */
const TOP_BAR_WIDTH = CIRCLE_SIZE * 0.52;
const TOP_BAR_HEIGHT = 180;
const TOP_BAR_RADIUS = 30;
const TOP_BAR_TOP = CIRCLE_RADIUS - RIBBON_ARC_RADIUS + PILL_HEIGHT_CENTER / 2 + 115;

/** Блок «Сегодня» + дата между плашками и карточкой ветра */
const TODAY_BLOCK_TOP = TOP_BAR_TOP - 105;
const MONTH_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
function formatTodayDate(d: Date): string {
  return `${d.getDate()} ${MONTH_GENITIVE[d.getMonth()]}`;
}

/** Сдвиг плашек по жесту: сколько px свайпа = 1 час */
const SLOT_WIDTH_PX = 56;
/** 9 плашек: слоты 0..8, центр = слот 4 = текущий час; по краям по одной частично видимой */
const PILL_SLOT_COUNT = 9;
const SLOT_CENTER = 4;
const OFFSET_MIN = 0;
const OFFSET_MAX = 17;

/** Горизонтальный зазор 3px между плашками: 9 плашек → 8 шагов, центр = индекс 4. */
function getArcAngles(): number[] {
  const R = RIBBON_ARC_RADIUS;
  const g = (w1: number, w2: number) => (w1 + w2) / 2 + GAP_PX;
  const gaps = [
    g(PILL_WIDTH, PILL_WIDTH),
    g(PILL_WIDTH, PILL_WIDTH),
    g(PILL_WIDTH, PILL_WIDTH),
    g(PILL_WIDTH, PILL_WIDTH_CENTER),
    g(PILL_WIDTH_CENTER, PILL_WIDTH),
    g(PILL_WIDTH, PILL_WIDTH),
    g(PILL_WIDTH, PILL_WIDTH),
    g(PILL_WIDTH, PILL_WIDTH),
  ];
  const cosDeltas = gaps.map((d) => d / R);
  const cos0 = -cosDeltas.slice(0, 4).reduce((a, b) => a + b, 0);
  const angles: number[] = [];
  let c = cos0;
  for (let i = 0; i < 9; i++) {
    angles.push(Math.acos(Math.max(-1, Math.min(1, c))));
    if (i < 8) c += cosDeltas[i];
  }
  return angles.map((a) => -a);
}

const ARC_ANGLES = getArcAngles();

/** Мок температур по часам (позже заменить на прогноз по API) */
function getHourTemp(baseTemp: number, hour: number): number {
  const t = [baseTemp - 1, baseTemp, baseTemp + 1, baseTemp, baseTemp - 1, baseTemp - 2];
  return t[hour % 6] ?? baseTemp;
}

/** Цвет текста и элементов компаса на фоне плашек */
const WIND_BLOCK_TEXT = '#1e4620';
const WIND_DIR_LABELS: { max: number; label: string }[] = [
  { max: 11.25, label: 'С' }, { max: 33.75, label: 'ССВ' }, { max: 56.25, label: 'СВ' }, { max: 78.75, label: 'ВСВ' },
  { max: 101.25, label: 'В' }, { max: 123.75, label: 'ВЮВ' }, { max: 146.25, label: 'ЮВ' }, { max: 168.75, label: 'ЮЮВ' },
  { max: 191.25, label: 'Ю' }, { max: 213.75, label: 'ЮЮЗ' }, { max: 236.25, label: 'ЮЗ' }, { max: 258.75, label: 'ЗЮЗ' },
  { max: 281.25, label: 'З' }, { max: 303.75, label: 'ЗСЗ' }, { max: 326.25, label: 'СЗ' }, { max: 348.75, label: 'ССЗ' },
  { max: 360, label: 'С' },
];
function windDirectionLabel(deg: number): string {
  const d = ((deg % 360) + 360) % 360;
  const item = WIND_DIR_LABELS.find((x) => d <= x.max);
  return item ? `${Math.round(deg)}° ${item.label}` : `${Math.round(deg)}° С`;
}

/** Контент блока «Ветер»: список слева, круглый компас справа */
function WindBlockContent({
  windSpeed,
  windGusts,
  windDirectionDeg,
}: {
  windSpeed: number;
  windGusts: number;
  windDirectionDeg: number;
}) {
  const dirLabel = windDirectionLabel(windDirectionDeg);
  const compassSize = 120;
  const cx = compassSize / 2;
  const cy = compassSize / 2;
  const tickR = compassSize / 2 - 2;
  const letterR = tickR + 4;
  const TICKS_PER_QUARTER = 22;
  const tickCount = TICKS_PER_QUARTER * 4;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angleDeg = i * (360 / tickCount);
    const quarterIndex = i % TICKS_PER_QUARTER;
    const isCardinal = quarterIndex === 0;
    const nextToLetter = quarterIndex === 1 || quarterIndex === TICKS_PER_QUARTER - 1;
    const isHighlighted = quarterIndex === 6 || quarterIndex === 15;
    return { angleDeg, isCardinal, nextToLetter, isHighlighted };
  }).filter((t) => !t.isCardinal && !t.nextToLetter);

  return (
    <View style={windStyles.inner}>
      <View style={windStyles.header}>
        <Ionicons name="leaf-outline" size={20} color={WIND_BLOCK_TEXT} />
        <Text style={windStyles.headerTitle}>ВЕТЕР</Text>
      </View>
      <View style={windStyles.contentRow}>
        <View style={windStyles.left}>
        <View style={windStyles.row}>
          <Text style={windStyles.label}>Ветер</Text>
          <Text style={windStyles.value}>{windSpeed} км/ч</Text>
        </View>
        <View style={windStyles.separator} />
        <View style={windStyles.row}>
          <Text style={windStyles.label}>Порывы ветра</Text>
          <Text style={windStyles.value}>{windGusts} км/ч</Text>
        </View>
        <View style={windStyles.separator} />
        <View style={windStyles.row}>
          <Text style={windStyles.label}>Направление</Text>
          <Text style={windStyles.value}>{dirLabel}</Text>
        </View>
        </View>
        <View style={windStyles.right}>
        <View style={[windStyles.compass, { width: compassSize, height: compassSize, borderRadius: compassSize / 2 }]}>
          {ticks.map(({ angleDeg, isHighlighted }, i) => {
            const rad = (angleDeg * Math.PI) / 180;
            const x = cx + tickR * Math.sin(rad);
            const y = cy - tickR * Math.cos(rad);
            const h = 8;
            const opacity = isHighlighted ? 0.9 : 0.35;
            const outX = (h / 2) * Math.sin(rad);
            const outY = -(h / 2) * Math.cos(rad);
            return (
              <View
                key={i}
                style={[
                  windStyles.compassTick,
                  {
                    left: x + outX - 1,
                    top: y + outY - h / 2,
                    height: h,
                    opacity,
                    transform: [{ rotate: `${angleDeg}deg` }],
                  },
                ]}
              />
            );
          })}
          {[
            { label: 'С', angle: 0 },
            { label: 'В', angle: 90 },
            { label: 'Ю', angle: 180 },
            { label: 'З', angle: 270 },
          ].map(({ label, angle }) => {
            const rad = (angle * Math.PI) / 180;
            let x = cx + letterR * Math.sin(rad);
            const y = cy - letterR * Math.cos(rad);
            if (label === 'С' || label === 'В' || label === 'З') x += 2;
            const charHalfW = 6;
            const charHalfH = 7;
            return (
              <Text
                key={label}
                style={[
                  windStyles.cardinalOnCircle,
                  { left: x - charHalfW, top: y - charHalfH },
                ]}
              >
                {label}
              </Text>
            );
          })}
          {(() => {
            const innerR = 24;
            const headRad = (windDirectionDeg * Math.PI) / 180;
            const tailRad = ((windDirectionDeg + 180) * Math.PI) / 180;
            const headX = cx + letterR * Math.sin(headRad);
            const headY = cy - letterR * Math.cos(headRad);
            const tailX = cx + letterR * Math.sin(tailRad);
            const tailY = cy - letterR * Math.cos(tailRad);
            const innerHeadX = cx + innerR * Math.sin(headRad);
            const innerHeadY = cy - innerR * Math.cos(headRad);
            const innerTailX = cx + innerR * Math.sin(tailRad);
            const innerTailY = cy - innerR * Math.cos(tailRad);
            const lineLen = letterR - innerR;
            const lineHalfW = 2;
            const headW = 8;
            const headH = 16;
            const headAngle = headRad;
            const midTailX = (tailX + innerTailX) / 2;
            const midTailY = (tailY + innerTailY) / 2;
            const baseCenterX = headX - headH * Math.sin(headAngle);
            const baseCenterY = headY + headH * Math.cos(headAngle);
            const thickLineLen = letterR - innerR - headH;
            const midHeadX = (innerHeadX + baseCenterX) / 2;
            const midHeadY = (innerHeadY + baseCenterY) / 2;
            const headCenterX = headX - (headH / 2) * Math.sin(headAngle);
            const headCenterY = headY + (headH / 2) * Math.cos(headAngle);
            const lineRotationDeg = windDirectionDeg;
            return (
              <>
                <View
                  style={[
                    windStyles.windArrowCircle,
                    { left: tailX - 4, top: tailY - 4 },
                  ]}
                />
                <View
                  style={[
                    windStyles.windArrowLineThin,
                    {
                      left: midTailX - lineHalfW,
                      top: midTailY - lineLen / 2,
                      height: lineLen,
                      transform: [{ rotate: `${lineRotationDeg}deg` }],
                    },
                  ]}
                />
                <View
                  style={[
                    windStyles.windArrowLineThick,
                    {
                      left: midHeadX - lineHalfW,
                      top: midHeadY - thickLineLen / 2,
                      height: thickLineLen,
                      transform: [{ rotate: `${lineRotationDeg}deg` }],
                    },
                  ]}
                />
                <View
                  style={[
                    windStyles.windArrowHeadWrap,
                    {
                      left: headCenterX - headW / 2,
                      top: headCenterY - headH / 2,
                      width: headW,
                      height: headH,
                      transform: [{ rotate: `${lineRotationDeg}deg` }],
                    },
                  ]}
                >
                  <View
                    style={[
                      windStyles.windArrowHead,
                      {
                        borderLeftWidth: headW / 2,
                        borderRightWidth: headW / 2,
                        borderBottomWidth: headH,
                      },
                    ]}
                  />
                  <View
                    style={[
                      windStyles.windArrowHeadNotch,
                      {
                        left: headW / 2 - 2.5,
                        borderLeftWidth: 2.5,
                        borderRightWidth: 2.5,
                        borderBottomWidth: 4,
                      },
                    ]}
                  />
                </View>
              </>
            );
          })()}
          <Text style={windStyles.compassSpeed}>{windSpeed}</Text>
          <Text style={windStyles.compassUnit}>км/ч</Text>
        </View>
      </View>
      </View>
    </View>
  );
}

/** Одна плашка: по дуге, отступ 3px, позиция интерполируется при прокрутке. */
function AnimatedRibbonPill({
  slotIndex,
  displayHour,
  offset,
  a0,
  a1,
  a2,
  a3,
  a4,
  a5,
  a6,
  a7,
  a8,
  c,
  weatherIcon,
  baseTemp,
}: {
  slotIndex: number;
  displayHour: number;
  offset: SharedValue<number>;
  a0: number;
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  a5: number;
  a6: number;
  a7: number;
  a8: number;
  c: Record<string, string>;
  weatherIcon: 'sunny-outline' | 'cloud-outline' | 'rainy-outline' | 'thunderstorm-outline';
  baseTemp: number;
}) {
  const cx = CIRCLE_SIZE / 2;
  const cy = CIRCLE_RADIUS;
  const R = RIBBON_ARC_RADIUS;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const frac = offset.value - Math.floor(offset.value);
    const s = slotIndex - frac;
    const i0 = Math.max(0, Math.min(7, Math.floor(s)));
    const i1 = Math.min(8, i0 + 1);
    const t = s - i0;
    const angles = [a0, a1, a2, a3, a4, a5, a6, a7, a8];
    const angle = angles[i0] * (1 - t) + angles[i1] * t;
    const isCenter = s >= 3.5 && s <= 4.5;
    const w = isCenter ? PILL_WIDTH_CENTER : PILL_WIDTH;
    const h = isCenter ? PILL_HEIGHT_CENTER : PILL_HEIGHT;
    return {
      position: 'absolute',
      left: cx + R * Math.cos(angle) - w / 2,
      top: cy + R * Math.sin(angle) - h / 2,
      width: w,
      height: h,
      borderRadius: w / 2,
    };
  });

  const temp = getHourTemp(baseTemp, displayHour);

  return (
    <Animated.View style={[styles.ribbonPill, animatedStyle]}>
      <Text style={[styles.pillHour, { color: c.textSecondary }]} numberOfLines={1}>
        {displayHour.toString().padStart(2, '0')}
      </Text>
      <View style={styles.pillIconWrap}>
        <Ionicons name={weatherIcon} size={22} color={c.text} />
      </View>
      <Text style={[styles.pillTemp, { color: c.text }]} numberOfLines={1}>
        {temp}°
      </Text>
    </Animated.View>
  );
}

export default function WeatherScreen() {
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptic = useHaptic();
  const { data: weatherData, icon: weatherIcon, loading: weatherLoading } = useWeather();
  const safeTemp = weatherData?.temp ?? 0;
  const safeIcon = weatherIcon ?? 'cloud-outline';
  const safeWindSpeed = weatherData?.windSpeed ?? 0;
  const safeWindGusts = weatherData?.windGusts ?? 0;
  const safeWindDir = weatherData?.windDirectionDeg ?? 0;


  const currentHour = new Date().getHours();
  /** Целая часть offset — какие 9 часов показываем (scrollIndex..scrollIndex+8) */
  const [scrollIndex, setScrollIndex] = useState(0);
  const scrollOffset = useSharedValue(0);
  const startOffset = useSharedValue(0);

  useAnimatedReaction(
    () => Math.floor(scrollOffset.value),
    (floorVal) => {
      runOnJS(setScrollIndex)(floorVal);
    },
    [scrollOffset]
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startOffset.value = scrollOffset.value;
    })
    .onUpdate((e) => {
      'worklet';
      const next = startOffset.value - e.translationX / SLOT_WIDTH_PX;
      scrollOffset.value = Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, next));
    })
    .onEnd(() => {
      'worklet';
      const snap = Math.round(scrollOffset.value);
      scrollOffset.value = withSpring(Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, snap)), {
        damping: 20,
        stiffness: 200,
      });
    });

  /** 9 плашек: слоты 0..8, центр 4; краевые частично за экраном — норма */
  const slotIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <View style={styles.container}>
      <ImageBackground source={WEATHER_BG} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.circleWrap} pointerEvents="none">
        <View style={[styles.circle, { backgroundColor: CIRCLE_COLOR }]} />
      </View>
      <View style={styles.ribbonClip} pointerEvents="box-none">
        <View style={styles.todayBlock}>
          <Text style={[styles.todayTitle, { color: c.text }]}>Сегодня</Text>
          <Text style={[styles.todayDate, { color: c.textSecondary }]}>{formatTodayDate(new Date())}</Text>
        </View>
        <View style={styles.circleTopBar}>
          <WindBlockContent
            windSpeed={safeWindSpeed}
            windGusts={safeWindGusts}
            windDirectionDeg={safeWindDir}
          />
        </View>
        <GestureDetector gesture={panGesture}>
          <View style={styles.ribbon}>
            {slotIndices.map((slotIndex) => {
              const stripIndex = scrollIndex + slotIndex;
              const hour = (currentHour - SLOT_CENTER + stripIndex + 24) % 24;
              return (
                <AnimatedRibbonPill
                  key={slotIndex}
                  slotIndex={slotIndex}
                  displayHour={hour}
                  offset={scrollOffset}
                  a0={ARC_ANGLES[0]}
                  a1={ARC_ANGLES[1]}
                  a2={ARC_ANGLES[2]}
                  a3={ARC_ANGLES[3]}
                  a4={ARC_ANGLES[4]}
                  a5={ARC_ANGLES[5]}
                  a6={ARC_ANGLES[6]}
                  a7={ARC_ANGLES[7]}
                  a8={ARC_ANGLES[8]}
                  c={c}
                  weatherIcon={safeIcon}
                  baseTemp={safeTemp}
                />
              );
            })}
          </View>
        </GestureDetector>
      </View>
      <Pressable
        style={[styles.backBtn, { top: insets.top + spacing.sm }]}
        onPress={() => {
          haptic.light();
          router.back();
        }}
        hitSlop={12}
        accessibilityLabel="Назад"
        accessibilityRole="button"
      >
        <View style={[styles.backBtnCircle, { backgroundColor: c.surface }, getShadow('sm') as object]}>
          <Ionicons name="chevron-back" size={28} color={c.text} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateY: -BG_IMAGE_OFFSET_UP }],
  },
  circleWrap: {
    position: 'absolute',
    top: CIRCLE_TOP,
    left: (SCREEN_WIDTH - CIRCLE_SIZE) / 2,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  todayBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: TODAY_BLOCK_TOP,
    alignItems: 'center',
    zIndex: 0,
  },
  todayTitle: {
    ...typography.body,
    fontSize: 26,
    fontWeight: '700',
  },
  todayDate: {
    ...typography.caption,
    fontSize: 21,
    marginTop: 4,
  },
  /** Скруглённый горизонтальный блок поверх круга */
  circleTopBar: {
    position: 'absolute',
    left: (CIRCLE_SIZE - TOP_BAR_WIDTH) / 2,
    top: TOP_BAR_TOP,
    width: TOP_BAR_WIDTH,
    height: TOP_BAR_HEIGHT,
    borderRadius: TOP_BAR_RADIUS,
    backgroundColor: TOP_BAR_COLOR,
    zIndex: 0,
    overflow: 'hidden',
  },
  /** Обрезка по кругу: плашки внизу за кругом не видны */
  ribbonClip: {
    position: 'absolute',
    left: (SCREEN_WIDTH - CIRCLE_SIZE) / 2,
    top: CIRCLE_TOP,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
    zIndex: 1,
  },
  ribbon: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  ribbonPill: {
    position: 'absolute',
    backgroundColor: RIBBON_PILL_COLOR,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  ribbonPillCenter: {
    paddingVertical: 10,
  },
  pillHour: {
    ...typography.caption,
    fontSize: 12,
  },
  pillIconWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillTemp: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  backBtn: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 2,
  },
  backBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const windStyles = StyleSheet.create({
  inner: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  left: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 24,
  },
  headerTitle: {
    color: WIND_BLOCK_TEXT,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    color: WIND_BLOCK_TEXT,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: WIND_BLOCK_TEXT,
    fontSize: 13,
    opacity: 0.9,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(30,70,32,0.2)',
    marginLeft: 0,
  },
  right: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  compass: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassTick: {
    position: 'absolute',
    width: 2,
    backgroundColor: WIND_BLOCK_TEXT,
    borderRadius: 1,
  },
  cardinalOnCircle: {
    position: 'absolute',
    color: WIND_BLOCK_TEXT,
    fontSize: 12,
    fontWeight: '600',
  },
  compassSpeed: {
    color: WIND_BLOCK_TEXT,
    fontSize: 30,
    fontWeight: '700',
  },
  compassUnit: {
    color: WIND_BLOCK_TEXT,
    opacity: 0.85,
    fontSize: 14,
    marginTop: -2,
  },
  windArrowLineThin: {
    position: 'absolute',
    width: 4,
    backgroundColor: WIND_BLOCK_TEXT,
    borderRadius: 1,
  },
  windArrowLineThick: {
    position: 'absolute',
    width: 4,
    backgroundColor: WIND_BLOCK_TEXT,
    borderRadius: 1,
  },
  windArrowCircle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WIND_BLOCK_TEXT,
  },
  windArrowHeadWrap: {
    position: 'absolute',
  },
  windArrowHead: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: WIND_BLOCK_TEXT,
  },
  windArrowHeadNotch: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    zIndex: 1,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },
});
