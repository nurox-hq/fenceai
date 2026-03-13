import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { PressableScale } from '@/components/ui/PressableScale';
import { Skeleton } from '@/components/ui/Skeleton';
import Colors from '@/constants/Colors';
import { MOCK_PROJECTS } from '@/constants/projects';
import type { Project, ProjectStatus } from '@/constants/projects';
import { PROJECTS_URL } from '@/constants/api';
import { getShadow, radius, spacing, tabBarFloating, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';
import { useAuth } from '@/contexts/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CALENDAR_SHEET_HEIGHT = SCREEN_HEIGHT * 0.5;
const CALENDAR_SHEET_BG = '#D2E9D5';

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getCalendarGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstWeekDay = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const leading = firstWeekDay;
  const total = Math.ceil((leading + daysInMonth) / 7) * 7;
  const grid: (number | null)[] = [];
  for (let i = 0; i < leading; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  while (grid.length < total) grid.push(null);
  return grid;
}

const CALENDAR_SWIPE_THRESHOLD = 50;

const PROJECT_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'В работе' },
  { id: 'done', label: 'Завершённые' },
];

/** Дата в формате YYYY-MM-DD для сравнения с rangeStart/rangeEnd */
function parseProjectDate(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).setHours(0, 0, 0, 0);
}

export default function ProjectsScreen() {
  const theme = useColorScheme();
  const c = Colors[theme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const haptic = useHaptic();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [hasNotifications] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [addProjectVisible, setAddProjectVisible] = useState(false);
  const [addProjectStep, setAddProjectStep] = useState<1 | 2 | 3 | 4>(1);
  const [clientFio, setClientFio] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [objectPhotos, setObjectPhotos] = useState<string[]>([]);
  const [planImageUri, setPlanImageUri] = useState<string | null>(null);
  const [projectStartDate, setProjectStartDate] = useState<Date | null>(null);
  const [projectEndDate, setProjectEndDate] = useState<Date | null>(null);
  const [datePickerFor, setDatePickerFor] = useState<'start' | 'end' | null>(null);
  const [datePickerMonth, setDatePickerMonth] = useState(() => new Date());
  const calendarSheetProgress = useSharedValue(0);
  const addProjectSheetProgress = useSharedValue(0);
  const addProjectKeyboardHeight = useSharedValue(0);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setRangeStart(null);
        setRangeEnd(null);
      };
    }, [])
  );

  useEffect(() => {
    if (!token) {
      setProjects([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setProjectsError(null);
        const res = await fetch(PROJECTS_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? `Ошибка загрузки проектов (${res.status})`);
        }
        if (cancelled) return;
        setProjects(Array.isArray(data.projects) ? (data.projects as Project[]) : []);
      } catch (e) {
        if (cancelled) return;
        setProjectsError(e instanceof Error ? e.message : 'Не удалось загрузить проекты');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const calendarMonthLabel = `${MONTH_NAMES[calendarMonth.getMonth()]} ${calendarMonth.getFullYear()}`;
  const calendarGrid = getCalendarGrid(calendarMonth.getFullYear(), calendarMonth.getMonth());

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === calendarMonth.getMonth() &&
    today.getFullYear() === calendarMonth.getFullYear();

  const cellToDate = (day: number) =>
    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
  const dateToTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const isDayInRange = (day: number): boolean => {
    if (rangeStart == null) return false;
    const startTime = dateToTime(rangeStart);
    const endTime = rangeEnd != null ? dateToTime(rangeEnd) : startTime;
    const cellTime = dateToTime(cellToDate(day));
    return cellTime >= Math.min(startTime, endTime) && cellTime <= Math.max(startTime, endTime);
  };

  const onSelectDay = (day: number) => {
    haptic.light();
    const d = cellToDate(day);
    if (rangeStart == null) {
      setRangeStart(d);
      setRangeEnd(null);
    } else if (rangeEnd == null) {
      const t1 = rangeStart.getTime();
      const t2 = d.getTime();
      if (t2 < t1) {
        setRangeStart(d);
        setRangeEnd(rangeStart);
      } else {
        setRangeEnd(d);
      }
    } else {
      setRangeStart(d);
      setRangeEnd(null);
    }
  };

  const goPrevMonth = () => {
    setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    haptic.light();
  };
  const goNextMonth = () => {
    setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    haptic.light();
  };

  const calendarPanGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      'worklet';
      if (e.translationX > CALENDAR_SWIPE_THRESHOLD) runOnJS(goPrevMonth)();
      else if (e.translationX < -CALENDAR_SWIPE_THRESHOLD) runOnJS(goNextMonth)();
    });

  useEffect(() => {
    if (calendarVisible) {
      calendarSheetProgress.value = withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      calendarSheetProgress.value = 0;
    }
  }, [calendarVisible]);

  useEffect(() => {
    if (addProjectVisible) {
      addProjectSheetProgress.value = withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      addProjectSheetProgress.value = 0;
    }
  }, [addProjectVisible]);

  useEffect(() => {
    if (!addProjectVisible) return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      addProjectKeyboardHeight.value = e.endCoordinates.height;
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      addProjectKeyboardHeight.value = 0;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [addProjectVisible]);

  const openCalendar = () => {
    haptic.light();
    setCalendarVisible(true);
  };

  const closeCalendar = () => {
    calendarSheetProgress.value = withTiming(
      0,
      { duration: 280, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setCalendarVisible)(false);
      }
    );
  };

  const onCalendarConfirm = () => {
    haptic.light();
    closeCalendar();
  };

  const formatDdMm = (d: Date) =>
    `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  const calendarFilterLabel =
    rangeStart == null
      ? null
      : rangeEnd == null
        ? formatDdMm(rangeStart)
        : `${formatDdMm(rangeStart)}-${formatDdMm(rangeEnd)}`;

  const filteredProjects = projects.filter((p) => {
    if (projectFilter === 'active' && p.status !== 'active') return false;
    if (projectFilter === 'done' && p.status !== 'done') return false;
    if (rangeStart != null) {
      const selStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime();
      const selEnd = rangeEnd != null
        ? new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate()).getTime()
        : selStart;
      const pStart = parseProjectDate(p.startDateYmd);
      const pEnd = parseProjectDate(p.endDateYmd);
      if (pEnd < selStart || pStart > selEnd) return false;
    }
    return true;
  });
  const statusLabel = (s: ProjectStatus) => (s === 'active' ? 'В работе' : 'Завершён');

  const calendarSheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: CALENDAR_SHEET_HEIGHT * (1 - calendarSheetProgress.value) }],
  }));

  const goVisualize = () => {
    haptic.light();
    router.push('/(tabs)/visualize');
  };

  const openAddProject = () => {
    haptic.light();
    setAddProjectStep(1);
    setAddProjectVisible(true);
  };
  const onAddProjectSheetClosed = useCallback(() => {
    setAddProjectVisible(false);
    setAddProjectStep(1);
    setObjectPhotos([]);
    setPlanImageUri(null);
    setProjectStartDate(null);
    setProjectEndDate(null);
    setClientFio('');
    setClientPhone('');
    setClientEmail('');
    addProjectKeyboardHeight.value = 0;
  }, []);

  const closeAddProject = () => {
    addProjectSheetProgress.value = withTiming(
      0,
      { duration: 280, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onAddProjectSheetClosed)();
      }
    );
  };

  const pickObjectPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    haptic.light();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setObjectPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const pickPlanImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    haptic.light();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      setPlanImageUri(result.assets[0].uri);
    }
  };

  const setPhotoAsCover = (index: number) => {
    if (index === 0) return;
    haptic.light();
    setObjectPhotos((prev) => {
      const next = [...prev];
      const [uri] = next.splice(index, 1);
      next.unshift(uri);
      return next;
    });
  };

  const removeObjectPhoto = (index: number) => {
    haptic.light();
    setObjectPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const goDatePickerPrevMonth = () => {
    setDatePickerMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    haptic.light();
  };
  const goDatePickerNextMonth = () => {
    setDatePickerMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    haptic.light();
  };
  const datePickerPanGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      'worklet';
      if (e.translationX > CALENDAR_SWIPE_THRESHOLD) runOnJS(goDatePickerPrevMonth)();
      else if (e.translationX < -CALENDAR_SWIPE_THRESHOLD) runOnJS(goDatePickerNextMonth)();
    });

  const addProjectSheetAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const keyboardH = addProjectKeyboardHeight.value;
    const height = CALENDAR_SHEET_HEIGHT + keyboardH;
    return {
      height,
      transform: [
        { translateY: CALENDAR_SHEET_HEIGHT * (1 - addProjectSheetProgress.value) },
      ],
    };
  });

  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const searchPillProgress = useSharedValue(0);
  const SEARCH_PILL_WIDTH = 220;

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

  return (
    <View style={[styles.container, { backgroundColor: '#F1F4F9' }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.md, paddingBottom: tabBarFloating.contentPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Верх: кнопка уведомлений слева, кнопка добавить + поиск справа */}
        <FadeInUp delay={0}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeftBtnWrap}>
              <PressableScale
                style={[styles.searchCapsule, { backgroundColor: c.surface }, getShadow('sm') as object]}
                onPress={() => haptic.light()}
              >
                <Ionicons name="notifications-outline" size={24} color={c.text} />
              <View
                style={[
                  styles.notificationBadge,
                  {
                    backgroundColor: hasNotifications ? '#D2E9D5' : c.textSecondary,
                    borderColor: c.surface,
                    borderWidth: 2,
                    opacity: hasNotifications ? 1 : 0.6,
                  },
                ]}
              />
              </PressableScale>
            </View>
            <View style={styles.headerButtons}>
              <PressableScale
                style={[styles.searchCapsule, { backgroundColor: c.surface }, getShadow('sm') as object]}
                onPress={openAddProject}
              >
                <Ionicons name="add" size={24} color={c.text} />
              </PressableScale>
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
                      <Ionicons name="search" size={22} color={c.text} />
                    </View>
                    <TextInput
                      ref={searchInputRef}
                      style={[styles.searchPillInput, { color: c.text }]}
                      placeholder="Найти проект"
                      placeholderTextColor={c.textSecondary}
                      onBlur={collapseSearch}
                      returnKeyType="search"
                    />
                  </View>
                </Animated.View>
              </PressableScale>
            </View>
          </View>
        </FadeInUp>

        {/* Фильтры — чуть выше */}
        <FadeInUp delay={60}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.chipsRow, { marginBottom: spacing.md }]}
          >
            <PressableScale
              style={[
                calendarFilterLabel ? styles.filterCalendarPill : styles.filterCalendarBtn,
                { backgroundColor: c.tabBarBg },
              ]}
              onPress={openCalendar}
            >
              {calendarFilterLabel != null ? (
                <View style={styles.filterCalendarPillInner}>
                  <Ionicons name="calendar-outline" size={22} color="#fff" />
                  <Text style={styles.filterCalendarLabel} numberOfLines={1}>
                    {calendarFilterLabel}
                  </Text>
                </View>
              ) : (
                <Ionicons name="calendar-outline" size={22} color="#fff" />
              )}
            </PressableScale>
            {PROJECT_FILTERS.map((f) => (
              <PressableScale
                key={f.id}
                style={[
                  styles.chip,
                  projectFilter === f.id
                    ? { backgroundColor: c.tabBarBg }
                    : { backgroundColor: c.surface, borderColor: c.border },
                ]}
                onPress={() => {
                  haptic.light();
                  setProjectFilter(f.id);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: projectFilter === f.id ? '#fff' : c.text },
                  ]}
                >
                  {f.label}
                </Text>
              </PressableScale>
            ))}
          </ScrollView>
        </FadeInUp>

        {/* Заголовок секции */}
        <FadeInUp delay={80}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Сортировка проектов по датам</Text>
        </FadeInUp>

        {loading ? (
          <View style={styles.skeletonBlock}>
            <Skeleton height={120} width="100%" borderRadius={radius.lg} />
            <Skeleton height={120} width="100%" borderRadius={radius.lg} style={{ marginTop: spacing.md }} />
            <Skeleton height={120} width="100%" borderRadius={radius.lg} style={{ marginTop: spacing.md }} />
          </View>
        ) : filteredProjects.length === 0 ? (
          <FadeInUp delay={100}>
            <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.emptyTitle, { color: c.text }]}>
                {projectsError ? 'Ошибка загрузки проектов' : 'Пока нет проектов'}
              </Text>
              <Text style={[styles.emptySub, { color: c.textSecondary }]}>
                {projectsError
                  ? projectsError
                  : projectFilter === 'all'
                    ? 'Создайте первый проект, чтобы видеть его в этом списке.'
                    : projectFilter === 'active'
                      ? 'Нет проектов в работе.'
                      : 'Нет завершённых проектов.'}
              </Text>
            </View>
          </FadeInUp>
        ) : (
          filteredProjects.map((p, index) => (
            <FadeInUp key={p.id} delay={100 + index * 30}>
              <View style={[styles.projectCard, { backgroundColor: '#69C5F8' }]}>
                <View style={styles.projectCardInner}>
                  <View style={styles.projectCardPillWrap}>
                    <View
                      style={[
                        styles.projectCardPill,
                        { backgroundColor: c.surface },
                        getShadow('sm') as object,
                      ]}
                    >
                      {p.coverImageUri ? (
                        <Image source={{ uri: p.coverImageUri }} style={styles.projectCardPillImage} />
                      ) : (
                        <Ionicons name="image-outline" size={24} color={c.textSecondary} />
                      )}
                    </View>
                  </View>
                  <View style={styles.projectCardContent}>
                    <View style={styles.projectCardStatusPill}>
                      <Text style={styles.projectCardStatusText}>
                        {statusLabel(p.status)}
                      </Text>
                    </View>
                    <Text style={[styles.projectCardAddress, { color: '#fff' }]} numberOfLines={2}>
                      {p.address}
                    </Text>
                    <View style={styles.projectCardDateRow}>
                      <Ionicons name="calendar-outline" size={18} color="#313642" />
                      <Text style={[styles.projectCardDateText, { color: '#313642' }]}>
                        {p.dateStart} — {p.dateEnd}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.projectCardArrowWrap} pointerEvents="box-none">
                    <PressableScale
                      style={[
                        styles.projectCardArrowBtn,
                        { backgroundColor: '#CDFF07' },
                        getShadow('sm') as object,
                      ]}
                      onPress={() => {
                        haptic.light();
                        router.push({
                          pathname: '/project/[id]',
                          params: {
                            id: p.id,
                            address: p.address,
                            status: p.status,
                            dateStart: p.dateStart ?? '',
                            dateEnd: p.dateEnd ?? '',
                            coverImageUri: p.coverImageUri ?? '',
                          },
                        });
                      }}
                    >
                    <Ionicons name="arrow-forward" size={22} color={c.text} />
                  </PressableScale>
                </View>
              </View>
            </FadeInUp>
          ))
        )}
      </ScrollView>

      <Modal
        visible={calendarVisible}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <View style={styles.calendarOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCalendar} />
          <Animated.View
            style={[
              styles.calendarSheet,
              { height: CALENDAR_SHEET_HEIGHT, backgroundColor: '#ffffff' },
              calendarSheetAnimatedStyle,
            ]}
          >
            <View style={styles.calendarSheetHeader}>
              <PressableScale
                style={[
                  styles.calendarSheetRoundBtn,
                  { backgroundColor: '#F1F4F9' },
                ]}
                onPress={closeCalendar}
              >
                <Ionicons name="close" size={24} color="#313642" />
              </PressableScale>
              <View
                style={[
                  styles.calendarSheetMonthPill,
                  { backgroundColor: '#ffffff' },
                ]}
              >
                <Text
                  style={[
                    styles.calendarSheetMonthText,
                    { color: '#313642' },
                  ]}
                  numberOfLines={1}
                >
                  {calendarMonthLabel}
                </Text>
              </View>
              <PressableScale
                style={[
                  styles.calendarSheetRoundBtn,
                  { backgroundColor: '#CDFF07' },
                ]}
                onPress={onCalendarConfirm}
              >
                <Ionicons name="checkmark" size={24} color="#000" />
              </PressableScale>
            </View>
            <GestureDetector gesture={calendarPanGesture}>
              <View style={styles.calendarSwipeArea}>
                <View style={styles.calendarSheetMonthsRow}>
                  {Array.from({ length: 12 }, (_, i) => {
                    const isActive = i === calendarMonth.getMonth();
                    return (
                      <View
                        key={i}
                        style={[
                          styles.calendarSheetSegment,
                          isActive
                            ? { backgroundColor: '#CDFF07' }
                            : { backgroundColor: '#E0E6F0' },
                        ]}
                      />
                    );
                  })}
                </View>

                <View
                  style={[
                    styles.calendarDayNamesPill,
                    { backgroundColor: '#F1F4F9' },
                  ]}
                >
                  {DAY_NAMES.map((name) => (
                    <Text key={name} style={[styles.calendarDayName, { color: c.textSecondary }]}>
                      {name}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGridWrap}>
                  {Array.from({ length: Math.ceil(calendarGrid.length / 7) }, (_, rowIdx) => {
                    const rowDays = calendarGrid.slice(rowIdx * 7, rowIdx * 7 + 7);
                    let rangeColMin = -1;
                    let rangeColMax = -1;
                    rowDays.forEach((day, colIdx) => {
                      if (day !== null && isDayInRange(day)) {
                        if (rangeColMin < 0) rangeColMin = colIdx;
                        rangeColMax = colIdx;
                      }
                    });
                    const hasRangeInRow = rangeColMin >= 0;
                    const cellPct = 100 / 7;
                    return (
                      <View key={rowIdx} style={styles.calendarGridRow}>
                        {hasRangeInRow && (
                          <View
                            pointerEvents="none"
                            style={[
                              styles.calendarRangeUnderlay,
                              {
                                left: `${rangeColMin * cellPct}%`,
                                width: `${(rangeColMax - rangeColMin + 1) * cellPct}%`,
                                backgroundColor: c.tabBarBg,
                              },
                            ]}
                          />
                        )}
                        {rowDays.map((day, colIdx) => {
                          const idx = rowIdx * 7 + colIdx;
                          if (day === null) {
                            return <View key={`e-${idx}`} style={styles.calendarDayCell} />;
                          }
                          const todayCell = isToday(day);
                          const inRange = isDayInRange(day);
                          return (
                            <PressableScale
                              key={`${day}-${idx}`}
                              style={[
                                styles.calendarDayCell,
                                ...(todayCell && !inRange ? [{ backgroundColor: 'rgba(0,0,0,0.08)' as const }] : []),
                                ...(inRange ? [{ backgroundColor: 'transparent' }] : []),
                              ]}
                              onPress={() => onSelectDay(day)}
                            >
                              <Text
                                style={[
                                  styles.calendarDayCellText,
                                  { color: inRange ? '#fff' : c.text },
                                  todayCell && !inRange && { fontWeight: '700' },
                                ]}
                              >
                                {day}
                              </Text>
                            </PressableScale>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              </View>
            </GestureDetector>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={addProjectVisible}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <View style={styles.calendarOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => (datePickerFor != null ? setDatePickerFor(null) : closeAddProject())}
          />
          <Animated.View
            style={[
              styles.calendarSheet,
              { backgroundColor: '#FFFFFF' },
              addProjectSheetAnimatedStyle,
            ]}
          >
            <View style={styles.calendarSheetHeader}>
              <PressableScale
                style={[
                  styles.calendarSheetRoundBtn,
                  { backgroundColor: '#F1F4F9' },
                ]}
                onPress={() => {
                  haptic.light();
                  if (addProjectStep > 1) setAddProjectStep((s) => (s - 1) as 1 | 2 | 3 | 4);
                  else closeAddProject();
                }}
              >
                <Ionicons name="chevron-back" size={24} color="#313642" />
              </PressableScale>
              <View
                style={[
                  styles.calendarSheetMonthPill,
                  { backgroundColor: '#69C5F8' },
                ]}
              >
                <Text
                  style={[
                    styles.calendarSheetMonthText,
                    { color: '#313642' },
                  ]}
                  numberOfLines={1}
                >
                  Новый проект
                </Text>
              </View>
              <PressableScale
                style={[
                  styles.calendarSheetRoundBtn,
                  { backgroundColor: '#F1F4F9' },
                ]}
                onPress={closeAddProject}
              >
                <Ionicons name="close" size={24} color="#313642" />
              </PressableScale>
            </View>
            <ScrollView
              style={styles.addProjectScroll}
              contentContainerStyle={[styles.addProjectContent, { paddingHorizontal: spacing.lg }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Подписи этапов и 4 отрезка */}
              <View style={styles.addProjectStageBlock}>
                <View style={styles.addProjectStageLabelsRow}>
                  {[1, 2, 3, 4].map((i) => (
                    <Text
                      key={i}
                      style={[
                        styles.addProjectStageLabel,
                        { color: addProjectStep === i ? c.text : c.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      Этап {i}
                    </Text>
                  ))}
                </View>
                <View style={styles.addProjectSegmentsRow}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.addProjectSegment,
                        addProjectStep >= i ? { backgroundColor: c.tabBarBg } : { backgroundColor: 'rgba(0,0,0,0.12)' },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {addProjectStep === 1 && (
                <>
                  <Text style={[styles.addProjectLabel, { color: c.text }]}>Название проекта</Text>
                  <View style={styles.addProjectFieldOuter}>
                    <TextInput
                      style={[styles.addProjectInput, styles.addProjectFieldInnerInput]}
                      placeholder="Введите название"
                      placeholderTextColor="#313642"
                      value={projectName}
                      onChangeText={setProjectName}
                    />
                  </View>
                  <Text style={[styles.addProjectLabel, { color: c.text }]}>Адрес объекта</Text>
                  <View style={styles.addProjectFieldOuter}>
                    <TextInput
                      style={[styles.addProjectInput, styles.addProjectFieldInnerInput]}
                      placeholder="Введите адрес"
                      placeholderTextColor="#313642"
                      value={projectAddress}
                      onChangeText={setProjectAddress}
                    />
                  </View>
                  <PressableScale
                    style={[styles.addProjectContinueBtn, { backgroundColor: c.tabBarBg }]}
                    onPress={() => {
                      haptic.light();
                      setAddProjectStep(2);
                    }}
                  >
                    <Text style={styles.addProjectContinueText}>Продолжить</Text>
                  </PressableScale>
                </>
              )}

              {addProjectStep === 2 && (
                <>
                  <Text style={[styles.addProjectLabel, { color: c.text }]}>Добавить фотографии объекта</Text>
                  <Text style={[styles.addProjectHint, { color: c.textSecondary }]}>
                    Перетащите в начало фото, которое будет обложкой проекта
                  </Text>
                  {objectPhotos.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.addProjectPhotoList}
                      contentContainerStyle={styles.addProjectPhotoListContent}
                    >
                      {objectPhotos.map((uri, index) => (
                        <View key={`${uri}-${index}`} style={styles.addProjectPhotoWrap}>
                          <PressableScale
                            style={[styles.addProjectPhotoThumb, { backgroundColor: c.surface }]}
                            onPress={() => setPhotoAsCover(index)}
                          >
                            <Image source={{ uri }} style={styles.addProjectPhotoThumbImage} />
                            {index === 0 && (
                              <View style={[styles.addProjectCoverBadge, { backgroundColor: c.tabBarBg }]}>
                                <Text style={styles.addProjectCoverBadgeText}>Обложка</Text>
                              </View>
                            )}
                          </PressableScale>
                          <Pressable
                            style={[styles.addProjectPhotoRemove, { backgroundColor: c.surface }]}
                            onPress={() => removeObjectPhoto(index)}
                          >
                            <Ionicons name="close" size={18} color={c.text} />
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  <Pressable
                    style={[styles.addProjectPhotoBlock, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={pickObjectPhotos}
                  >
                    <Ionicons name="images-outline" size={32} color={c.textSecondary} />
                    <Text style={[styles.addProjectPhotoHint, { color: c.textSecondary }]}>
                      {objectPhotos.length > 0 ? 'Добавить ещё' : 'Нажмите, чтобы добавить'}
                    </Text>
                  </Pressable>
                  <Text style={[styles.addProjectLabel, { color: c.text }]}>Добавить план объекта</Text>
                  {planImageUri ? (
                    <View style={styles.addProjectPlanWrap}>
                      <Image source={{ uri: planImageUri }} style={styles.addProjectPlanThumb} />
                      <Pressable
                        style={[styles.addProjectPlanRemove, { backgroundColor: c.surface }]}
                        onPress={() => {
                          haptic.light();
                          setPlanImageUri(null);
                        }}
                      >
                        <Ionicons name="close" size={20} color={c.text} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={[styles.addProjectPhotoBlock, { backgroundColor: c.surface, borderColor: c.border }]}
                      onPress={pickPlanImage}
                    >
                      <Ionicons name="document-outline" size={32} color={c.textSecondary} />
                      <Text style={[styles.addProjectPhotoHint, { color: c.textSecondary }]}>Добавить план</Text>
                    </Pressable>
                  )}
                  <PressableScale
                    style={[styles.addProjectContinueBtn, { backgroundColor: c.tabBarBg }]}
                    onPress={() => {
                      haptic.light();
                      setAddProjectStep(3);
                    }}
                  >
                    <Text style={styles.addProjectContinueText}>Продолжить</Text>
                  </PressableScale>
                </>
              )}

              {addProjectStep === 3 && (
                <>
                  <Text style={[styles.addProjectLabel, { color: c.text }]}>Дата начала</Text>
                  <View style={styles.addProjectFieldOuter}>
                    <Pressable
                      style={[
                        styles.addProjectInput,
                        styles.addProjectDateInput,
                        styles.addProjectFieldInnerPressable,
                      ]}
                      onPress={() => {
                        haptic.light();
                        setDatePickerFor('start');
                        setDatePickerMonth(projectStartDate ?? new Date());
                      }}
                    >
                      <Text style={[styles.addProjectDateInputText, { color: projectStartDate ? c.text : c.textSecondary }]}>
                        {projectStartDate
                          ? `${projectStartDate.getDate().toString().padStart(2, '0')}.${(projectStartDate.getMonth() + 1).toString().padStart(2, '0')}.${projectStartDate.getFullYear()}`
                          : 'Выберите дату'}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color={c.textSecondary} />
                    </Pressable>
                  </View>
                  <Text style={[styles.addProjectLabel, { color: c.text }]}>Дата окончания</Text>
                  <View style={styles.addProjectFieldOuter}>
                    <Pressable
                      style={[
                        styles.addProjectInput,
                        styles.addProjectDateInput,
                        styles.addProjectFieldInnerPressable,
                      ]}
                      onPress={() => {
                        haptic.light();
                        setDatePickerFor('end');
                        setDatePickerMonth(projectEndDate ?? projectStartDate ?? new Date());
                      }}
                    >
                      <Text style={[styles.addProjectDateInputText, { color: projectEndDate ? c.text : c.textSecondary }]}>
                        {projectEndDate
                          ? `${projectEndDate.getDate().toString().padStart(2, '0')}.${(projectEndDate.getMonth() + 1).toString().padStart(2, '0')}.${projectEndDate.getFullYear()}`
                          : 'Выберите дату'}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color={c.textSecondary} />
                    </Pressable>
                  </View>
                  <PressableScale
                    style={[styles.addProjectContinueBtn, { backgroundColor: c.tabBarBg }]}
                    onPress={() => {
                      haptic.light();
                      setAddProjectStep(4);
                    }}
                  >
                    <Text style={styles.addProjectContinueText}>Продолжить</Text>
                  </PressableScale>
                </>
              )}

              {addProjectStep === 4 && (
                <>
                  <Text style={[styles.addProjectLabel, { color: c.text }]}>Контактная информация клиента</Text>
                  <Text style={[styles.addProjectLabelSmall, { color: c.textSecondary }]}>ФИО</Text>
                  <View style={styles.addProjectFieldOuter}>
                    <TextInput
                      style={[styles.addProjectInput, styles.addProjectFieldInnerInput]}
                      placeholder="Фамилия Имя Отчество"
                      placeholderTextColor={c.textSecondary}
                      value={clientFio}
                      onChangeText={setClientFio}
                    />
                  </View>
                  <Text style={[styles.addProjectLabelSmall, { color: c.textSecondary }]}>Номер телефона</Text>
                  <View style={styles.addProjectFieldOuter}>
                    <TextInput
                      style={[styles.addProjectInput, styles.addProjectFieldInnerInput]}
                      placeholder="+7 (___) ___-__-__"
                      placeholderTextColor={c.textSecondary}
                      value={clientPhone}
                      onChangeText={setClientPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <Text style={[styles.addProjectLabelSmall, { color: c.textSecondary }]}>Эл. почта</Text>
                  <View style={styles.addProjectFieldOuter}>
                    <TextInput
                      style={[styles.addProjectInput, styles.addProjectFieldInnerInput]}
                      placeholder="email@example.com"
                      placeholderTextColor={c.textSecondary}
                      value={clientEmail}
                      onChangeText={setClientEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  <PressableScale
                    style={[styles.addProjectContinueBtn, { backgroundColor: c.tabBarBg }]}
                    onPress={() => {
                      if (!projectAddress.trim()) {
                        haptic.light();
                        return;
                      }
                      haptic.medium();

                      const now = new Date();
                      const start = projectStartDate ?? now;
                      const end = projectEndDate ?? start;
                      const toYmd = (d: Date) =>
                        `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
                          .getDate()
                          .toString()
                          .padStart(2, '0')}`;
                      const toDdMm = (d: Date) =>
                        `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
                          .toString()
                          .padStart(2, '0')}`;

                      const body = {
                        address: projectAddress.trim(),
                        status: 'active' as ProjectStatus,
                        dateStart: toDdMm(start),
                        dateEnd: toDdMm(end),
                        startDateYmd: toYmd(start),
                        endDateYmd: toYmd(end),
                        coverImageUri: objectPhotos[0] ?? null,
                        planImageUri: planImageUri ?? null,
                        clientName: clientFio.trim() || null,
                        clientPhone: clientPhone.trim() || null,
                        clientEmail: clientEmail.trim() || null,
                      };

                      (async () => {
                        try {
                          if (!token) throw new Error('Нет токена авторизации');
                          const res = await fetch(PROJECTS_URL, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify(body),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error ?? `Ошибка создания проекта (${res.status})`);
                          setProjects((prev) => [data as Project, ...prev]);
                          closeAddProject();
                        } catch (e) {
                          haptic.light();
                          // TODO: можно вывести отдельную ошибку создания проекта
                          console.warn('Create project error', e);
                        }
                      })();
                    }}
                  >
                    <Text style={styles.addProjectContinueText}>Продолжить</Text>
                  </PressableScale>
                </>
              )}
            </ScrollView>
          </Animated.View>

          {/* Тот же календарь, что в фильтрах — выбор даты на этапе 3 */}
          {datePickerFor != null && (() => {
            const dpGrid = getCalendarGrid(datePickerMonth.getFullYear(), datePickerMonth.getMonth());
            const dpToday = new Date();
            const dpIsToday = (day: number) =>
              dpToday.getDate() === day &&
              dpToday.getMonth() === datePickerMonth.getMonth() &&
              dpToday.getFullYear() === datePickerMonth.getFullYear();
            const dpSelectedDate = datePickerFor === 'start' ? projectStartDate : projectEndDate;
            const dpCellToDate = (day: number) =>
              new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth(), day);
            const dpIsSelected = (day: number) => {
              if (dpSelectedDate == null) return false;
              const d = dpCellToDate(day);
              return d.getDate() === dpSelectedDate.getDate() && d.getMonth() === dpSelectedDate.getMonth() && d.getFullYear() === dpSelectedDate.getFullYear();
            };
            const dpIsDisabled = (day: number) =>
              datePickerFor === 'end' &&
              projectStartDate != null &&
              dpCellToDate(day).getTime() < new Date(projectStartDate.getFullYear(), projectStartDate.getMonth(), projectStartDate.getDate()).getTime();
            const onDpSelectDay = (day: number) => {
              if (dpIsDisabled(day)) return;
              haptic.light();
              const d = dpCellToDate(day);
              if (datePickerFor === 'start') setProjectStartDate(d);
              else setProjectEndDate(d);
              requestAnimationFrame(() => setDatePickerFor(null));
            };
            return (
              <View style={[StyleSheet.absoluteFillObject, styles.calendarOverlay]} pointerEvents="box-none">
                <Pressable
                  style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
                  onPress={() => setDatePickerFor(null)}
                />
                <View
                  style={[
                    styles.calendarSheet,
                    { height: CALENDAR_SHEET_HEIGHT, backgroundColor: CALENDAR_SHEET_BG },
                  ]}
                >
                  <View style={styles.calendarSheetHeader}>
                    <PressableScale
                      style={[styles.calendarSheetRoundBtn, { backgroundColor: c.surface }]}
                      onPress={() => setDatePickerFor(null)}
                    >
                      <Ionicons name="close" size={24} color={c.text} />
                    </PressableScale>
                    <View style={[styles.calendarSheetMonthPill, { backgroundColor: c.surface }]}>
                      <Text style={[styles.calendarSheetMonthText, { color: c.text }]} numberOfLines={1}>
                        {datePickerFor === 'start' ? 'Дата начала' : 'Дата окончания'}
                      </Text>
                    </View>
                    <PressableScale
                      style={[styles.calendarSheetRoundBtn, { backgroundColor: c.tabBarBg }]}
                      onPress={() => setDatePickerFor(null)}
                    >
                      <Ionicons name="checkmark" size={24} color="#fff" />
                    </PressableScale>
                  </View>
                  <GestureDetector gesture={datePickerPanGesture}>
                    <View style={styles.calendarSwipeArea}>
                      <View style={styles.calendarSheetMonthsRow}>
                        {Array.from({ length: 12 }, (_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.calendarSheetSegment,
                              i === datePickerMonth.getMonth()
                                ? { backgroundColor: c.tabBarBg }
                                : { backgroundColor: 'rgba(0,0,0,0.12)' },
                            ]}
                          />
                        ))}
                      </View>
                      <View style={[styles.calendarDayNamesPill, { backgroundColor: c.surface }]}>
                        {DAY_NAMES.map((name) => (
                          <Text key={name} style={[styles.calendarDayName, { color: c.textSecondary }]}>{name}</Text>
                        ))}
                      </View>
                      <View style={styles.calendarGridWrap}>
                        {Array.from({ length: Math.ceil(dpGrid.length / 7) }, (_, rowIdx) => {
                          const rowDays = dpGrid.slice(rowIdx * 7, rowIdx * 7 + 7);
                          return (
                            <View key={rowIdx} style={styles.calendarGridRow}>
                              {rowDays.map((day, colIdx) => {
                                const idx = rowIdx * 7 + colIdx;
                                if (day === null) {
                                  return <View key={`e-${idx}`} style={styles.calendarDayCell} />;
                                }
                                const selected = dpIsSelected(day);
                                const todayCell = dpIsToday(day);
                                const disabled = dpIsDisabled(day);
                                return (
                                  <PressableScale
                                    key={`${day}-${idx}`}
                                    style={[
                                      styles.calendarDayCell,
                                      ...(todayCell && !selected ? [{ backgroundColor: 'rgba(0,0,0,0.08)' as const }] : []),
                                      ...(selected ? [{ backgroundColor: c.tabBarBg }] : []),
                                      ...(disabled ? [{ opacity: 0.4 }] : []),
                                    ]}
                                    onPress={() => onDpSelectDay(day)}
                                  >
                                    <Text
                                      style={[
                                        styles.calendarDayCellText,
                                        { color: selected ? '#fff' : c.text },
                                        todayCell && !selected && { fontWeight: '700' },
                                      ]}
                                    >
                                      {day}
                                    </Text>
                                  </PressableScale>
                                );
                              })}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </GestureDetector>
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeftBtnWrap: { position: 'relative' },
  notificationBadge: {
    position: 'absolute',
    top: 3,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 30,
  },
  headerTitle: { ...typography.title, fontSize: 22 },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
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
  searchCapsule: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: { gap: spacing.sm, marginBottom: spacing.md, paddingRight: spacing.md },
  filterCalendarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCalendarPill: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    justifyContent: 'center',
  },
  filterCalendarPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterCalendarLabel: {
    color: '#fff',
    ...typography.label,
    fontSize: 13,
  },
  chip: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { ...typography.label },
  sectionTitle: { ...typography.headline, marginBottom: spacing.md },
  projectCard: {
    width: '100%',
    height: 200,
    borderRadius: 35,
    marginBottom: spacing.md,
    position: 'relative',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  projectCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  projectCardPillWrap: {
    alignItems: 'center',
  },
  projectCardPill: {
    width: 80,
    height: 160,
    borderRadius: 40,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectCardPillImage: {
    width: '100%',
    height: '100%',
  },
  projectCardContent: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingRight: 52,
    justifyContent: 'flex-start',
  },
  projectCardStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#CDFF07',
    marginBottom: spacing.sm,
  },
  projectCardStatusText: {
    ...typography.caption,
    fontSize: 13,
    color: '#000',
  },
  projectCardAddress: {
    ...typography.headline,
    fontSize: 18,
    marginBottom: spacing.sm,
  },
  projectCardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  projectCardDateText: {
    ...typography.bodySmall,
    fontSize: 14,
  },
  projectCardArrowWrap: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
  },
  projectCardArrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonBlock: { marginBottom: spacing.md },
  empty: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: { ...typography.headline, marginBottom: spacing.sm },
  emptySub: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  emptyBtn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  emptyBtnText: { color: '#fff', ...typography.label },
  calendarOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  calendarSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  calendarSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  calendarSheetRoundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarSheetMonthPill: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  calendarSheetMonthText: {
    ...typography.headline,
    fontSize: 16,
  },
  addProjectScroll: { flex: 1 },
  addProjectContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  addProjectStageBlock: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  addProjectStageLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  addProjectStageLabel: {
    flex: 1,
    ...typography.label,
    fontSize: 15,
    textAlign: 'center',
  },
  addProjectSegmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addProjectSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  addProjectDateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addProjectDateInputText: {
    ...typography.body,
    fontSize: 16,
  },
  addProjectLabel: {
    ...typography.label,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  addProjectLabelSmall: {
    ...typography.label,
    fontSize: 12,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  addProjectInput: {
    ...typography.body,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  addProjectFieldOuter: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#69C5F8',
    padding: 3,
    marginBottom: spacing.md,
  },
  addProjectFieldInnerInput: {
    backgroundColor: '#CDFF07',
    borderRadius: 24,
    borderWidth: 0,
    marginBottom: 0,
  },
  addProjectFieldInnerPressable: {
    backgroundColor: '#CDFF07',
    borderRadius: 24,
    borderWidth: 0,
    marginBottom: 0,
  },
  addProjectContinueBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProjectContinueText: {
    ...typography.headline,
    fontSize: 17,
    color: '#fff',
  },
  addProjectPhotoList: { marginBottom: spacing.sm },
  addProjectPhotoListContent: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 4 },
  addProjectPhotoWrap: { position: 'relative' },
  addProjectPhotoThumb: {
    width: 80,
    height: 80,
    borderRadius: 24,
    overflow: 'hidden',
  },
  addProjectPhotoThumbImage: { width: '100%', height: '100%' },
  addProjectCoverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    alignItems: 'center',
  },
  addProjectCoverBadgeText: { ...typography.caption, fontSize: 11, color: '#fff' },
  addProjectPhotoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProjectPhotoBlock: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 28,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  addProjectPhotoHint: {
    ...typography.body,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  addProjectPlanWrap: { position: 'relative', marginBottom: spacing.md, alignSelf: 'flex-start' },
  addProjectPlanThumb: { width: 120, height: 120, borderRadius: 24 },
  addProjectPlanRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProjectHint: {
    ...typography.caption,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  calendarSheetMonthsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarSheetSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  calendarSwipeArea: {
    marginTop: 0,
  },
  calendarDayNamesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  calendarDayName: {
    flex: 1,
    ...typography.caption,
    fontSize: 12,
    textAlign: 'center',
  },
  calendarGridWrap: {
    marginTop: 0,
  },
  calendarGridRow: {
    flexDirection: 'row',
    marginBottom: 6,
    position: 'relative',
    alignItems: 'stretch',
  },
  calendarRangeUnderlay: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 18,
  },
  calendarDayCell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  calendarDayCellText: {
    ...typography.body,
    fontSize: 15,
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  datePickerBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  datePickerTitle: {
    ...typography.headline,
    fontSize: 18,
  },
  datePickerMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  datePickerNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerMonthText: {
    ...typography.headline,
    fontSize: 16,
  },
  datePickerDayNames: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingBottom: spacing.xs,
    marginBottom: spacing.sm,
  },
  datePickerDayName: {
    flex: 1,
    ...typography.caption,
    fontSize: 12,
    textAlign: 'center',
  },
  datePickerGrid: {},
  datePickerGridRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  datePickerDayCell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  datePickerDayCellToday: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  datePickerDayCellDisabled: {
    opacity: 0.4,
  },
  datePickerDayCellText: {
    ...typography.body,
    fontSize: 15,
  },
});
