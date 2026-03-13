import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { getProjectById, Project } from '@/constants/projects';
import { VISUALIZE_URL } from '@/constants/api';
import { radius, spacing, tabBarFloating, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';
import { useAuth } from '@/contexts/AuthContext';

const PROJECT_TABS = [
  { id: 'info', label: 'Информация' },
  { id: 'media', label: 'Медиа' },
  { id: 'visual', label: 'Визуал' },
  { id: 'kp', label: 'КП' },
  { id: 'estimate', label: 'Смета' },
  { id: 'documents', label: 'Документы' },
] as const;

type TabId = (typeof PROJECT_TABS)[number]['id'];

const COVER_BORDER_RADIUS = 35;
/** Цвет круга на главной — фон блока Медиа */
const CIRCLE_COLOR = '#D2E9D5';
const MEDIA_GRID_COLUMNS = 3;
const MEDIA_GRID_PAD_H = spacing.md;
const MEDIA_GRID_GAP = spacing.sm;
const MEDIA_GRID_TOP_OFFSET = spacing.lg;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_ASPECT = 16 / 10;
const COVER_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const COVER_HEIGHT = COVER_WIDTH / COVER_ASPECT;
const MEDIA_CARD_SIZE =
  (SCREEN_WIDTH - MEDIA_GRID_PAD_H * 2 - MEDIA_GRID_GAP * (MEDIA_GRID_COLUMNS - 1)) / MEDIA_GRID_COLUMNS;

export default function ProjectScreen() {
  const { id, address, status, dateStart, dateEnd, coverImageUri } = useLocalSearchParams<{
    id: string;
    address?: string;
    status?: string;
    dateStart?: string;
    dateEnd?: string;
    coverImageUri?: string;
  }>();

  let project: Project | undefined;
  if (id) {
    if (address && status && dateStart && dateEnd) {
      project = {
        id: String(id),
        address: String(address),
        status: status === 'done' ? 'done' : 'active',
        dateStart: String(dateStart),
        dateEnd: String(dateEnd),
        startDateYmd: '',
        endDateYmd: '',
        coverImageUri: coverImageUri && coverImageUri.length > 0 ? String(coverImageUri) : null,
      };
    } else {
      project = getProjectById(String(id));
    }
  }

  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [expandedMediaIndex, setExpandedMediaIndex] = useState<number | null>(null);
  const mediaFullscreenProgress = useSharedValue(0);
  const [isEditing, setIsEditing] = useState(false);
  const editProgress = useSharedValue(0);
  const [visualStep, setVisualStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [visualSourcePhotos, setVisualSourcePhotos] = useState<number[]>([]);
  const [visualReference, setVisualReference] = useState<string | null>(null);
  const [visualPrompt, setVisualPrompt] = useState('');
  const [visualIsProcessing, setVisualIsProcessing] = useState(false);
  const [visualAddedToMedia, setVisualAddedToMedia] = useState(false);
  const [visualBaseImage, setVisualBaseImage] = useState<string | null>(null);
  const [visualResultSummary, setVisualResultSummary] = useState<string | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);
  const theme = useColorScheme();
  const c = Colors[theme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptic = useHaptic();
  const { token } = useAuth();

  if (!project) {
    return (
      <View style={[styles.container, { backgroundColor: c.homeBackground }]}>
        <Text style={[styles.notFound, { color: c.text }]}>Проект не найден</Text>
      </View>
    );
  }

  const statusLabel = project.status === 'active' ? 'В работе' : 'Завершён';

  useEffect(() => {
    if (expandedMediaIndex !== null) {
      mediaFullscreenProgress.value = withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      mediaFullscreenProgress.value = withTiming(0, {
        duration: 220,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [expandedMediaIndex]);

  useEffect(() => {
    editProgress.value = withTiming(isEditing ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [isEditing]);

  const mediaBackdropStyle = useAnimatedStyle(() => ({
    opacity: mediaFullscreenProgress.value * 0.6,
  }));
  const mediaPhotoStyle = useAnimatedStyle(() => ({
    opacity: mediaFullscreenProgress.value,
    transform: [{ scale: 0.85 + 0.15 * mediaFullscreenProgress.value }],
  }));

  const infoEditStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: 1 + 0.02 * editProgress.value,
      },
    ],
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18 * editProgress.value,
    shadowRadius: 24 * editProgress.value,
    elevation: 10 * editProgress.value,
  }));

  const handleVisualPickFromMedia = () => {
    haptic.light();
    setVisualAddedToMedia(false);
    setVisualResultSummary(null);
    setVisualError(null);
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspectRatio: [4, 3],
      });
      if (!result.canceled && result.assets[0]) {
        setVisualBaseImage(result.assets[0].uri);
        setVisualSourcePhotos([0]);
        setVisualStep(2);
      }
    })();
  };

  const handleVisualStartProcessing = async () => {
    if (!visualPrompt.trim() || !visualBaseImage || !token) return;
    haptic.light();
    setVisualIsProcessing(true);
    setVisualError(null);
    setVisualResultSummary(null);
    setVisualStep(4);
    try {
      const base64 = await FileSystem.readAsStringAsync(visualBaseImage, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const res = await fetch(VISUALIZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageBase64: base64,
          features: {
            referenceStyle: visualReference,
          },
          prompt: visualPrompt.trim(),
          projectId: project.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Ошибка визуализации (${res.status})`);
      }
      const summary: string =
        typeof data.visualization?.message === 'string'
          ? data.visualization.message
          : 'Визуализация успешно выполнена.';
      setVisualResultSummary(summary);
      setVisualStep(5);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось выполнить визуализацию';
      setVisualError(msg);
      setVisualStep(5);
    } finally {
      setVisualIsProcessing(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: activeTab === 'info' ? '#69C5F8' : c.homeBackground },
      ]}
    >
      {/* Кнопка назад */}
      <View style={[styles.headerRow, { paddingTop: insets.top + spacing.md }]}>
        <PressableScale
          style={[styles.backBtn, { backgroundColor: '#CDFF07' }]}
          onPress={() => {
            haptic.light();
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </PressableScale>
        {activeTab === 'info' && (
          <PressableScale
            style={[styles.backBtn, { backgroundColor: '#CDFF07' }]}
            onPress={() => {
              haptic.light();
              setIsEditing((prev) => !prev);
            }}
          >
            <Ionicons
              name={isEditing ? 'checkmark' : 'create-outline'}
              size={22}
              color={c.text}
            />
          </PressableScale>
        )}
      </View>

      {/* Вкладки как фильтры */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={styles.tabsScroll}
      >
        {PROJECT_TABS.map((tab) => (
          <PressableScale
            key={tab.id}
            style={[
              styles.tabChip,
              activeTab === tab.id
                ? { backgroundColor: c.tabBarBg }
                : { backgroundColor: c.surface, borderColor: c.border },
            ]}
            onPress={() => {
              haptic.light();
              setActiveTab(tab.id);
            }}
          >
            <Text
              style={[
                styles.tabChipText,
                { color: activeTab === tab.id ? '#fff' : c.text },
              ]}
            >
              {tab.label}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>

      {activeTab === 'media' ? (
        <>
        <View style={styles.mediaBlockWrap}>
          <View style={[styles.mediaBlock, { backgroundColor: '#69C5F8' }]}>
            <ScrollView
              style={styles.mediaGridScroll}
              contentContainerStyle={[
                styles.mediaGridContent,
                {
                  paddingTop: MEDIA_GRID_TOP_OFFSET,
                  paddingHorizontal: MEDIA_GRID_PAD_H,
                  paddingBottom: spacing.xl,
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.mediaGridLabelsRow, { marginBottom: spacing.sm }]}>
                <View style={[styles.mediaGridLabelCell, { width: MEDIA_CARD_SIZE }]}>
                  <Text style={[styles.mediaGridLabel, { color: c.text }]} numberOfLines={1}>
                    Исходные
                  </Text>
                </View>
                <View style={[styles.mediaGridLabelCell, { width: MEDIA_CARD_SIZE }]}>
                  <Text style={[styles.mediaGridLabel, { color: c.text }]} numberOfLines={1}>
                    Визуал
                  </Text>
                </View>
                <View style={[styles.mediaGridLabelCell, { width: MEDIA_CARD_SIZE }]}>
                  <Text style={[styles.mediaGridLabel, { color: c.text }]} numberOfLines={1}>
                    Результат
                  </Text>
                </View>
              </View>
              <View style={styles.mediaGrid}>
                {Array.from({ length: 9 }, (_, i) => (
                  <PressableScale
                    key={i}
                    style={[
                      styles.mediaGridCard,
                      {
                        width: MEDIA_CARD_SIZE,
                        height: MEDIA_CARD_SIZE,
                        backgroundColor: c.surface,
                      },
                    ]}
                    onPress={() => {
                      haptic.light();
                      setExpandedMediaIndex(i);
                    }}
                  >
                    <Ionicons name="image-outline" size={28} color={c.textSecondary} />
                  </PressableScale>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <Modal
          visible={expandedMediaIndex !== null}
          transparent
          animationType="none"
          statusBarTranslucent
        >
          <View style={styles.mediaFullscreenOverlay}>
            <Animated.View style={[StyleSheet.absoluteFillObject, styles.mediaFullscreenBackdrop, mediaBackdropStyle]} />
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setExpandedMediaIndex(null)} />
            <View style={styles.mediaFullscreenContentWrap} pointerEvents="box-none">
              <Animated.View
                style={[
                  styles.mediaFullscreenPhoto,
                  { backgroundColor: c.surface },
                  mediaPhotoStyle,
                ]}
                pointerEvents="auto"
              >
                <Ionicons name="image-outline" size={64} color={c.textSecondary} />
                <Text style={[styles.mediaFullscreenLabel, { color: c.textSecondary }]}>
                  Фото {expandedMediaIndex != null ? expandedMediaIndex + 1 : ''}
                </Text>
              </Animated.View>
            </View>
          </View>
        </Modal>
        </>
      ) : (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + tabBarFloating.contentPaddingBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'info' && (
          <>
            {/* Блок с обложкой — скругление 35 */}
            <View
              style={[
                styles.coverBlock,
                {
                  backgroundColor: c.surface,
                  borderRadius: COVER_BORDER_RADIUS,
                  overflow: 'hidden',
                },
              ]}
            >
              {project.coverImageUri ? (
                <Image
                  source={{ uri: project.coverImageUri }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.coverPlaceholder, { backgroundColor: c.border }]}>
                  <Ionicons name="image-outline" size={48} color={c.textSecondary} />
                  <Text style={[styles.coverPlaceholderText, { color: c.textSecondary }]}>
                    Обложка проекта
                  </Text>
                </View>
              )}
            </View>
            {/* Информация под обложкой */}
            <View style={[styles.infoCard, { backgroundColor: c.surface }]}>
              <View style={styles.cardRow}>
                <Text style={[styles.label, { color: c.textSecondary }]}>Статус</Text>
                <Text style={[styles.value, { color: c.text }]}>{statusLabel}</Text>
              </View>
              <View style={[styles.cardRow, styles.cardRowBorder, { borderTopColor: c.border }]}>
                <Text style={[styles.label, { color: c.textSecondary }]}>Адрес</Text>
                <Text style={[styles.value, { color: c.text }]}>{project.address}</Text>
              </View>
              <View style={[styles.cardRow, styles.cardRowBorder, { borderTopColor: c.border }]}>
                <Text style={[styles.label, { color: c.textSecondary }]}>Сроки</Text>
                <Text style={[styles.value, { color: c.text }]}>
                  {project.dateStart} — {project.dateEnd}
                </Text>
              </View>
            </View>
            {/* Контактная информация клиента */}
            <Animated.View
              style={[
                styles.infoCard,
                { backgroundColor: c.surface, marginTop: spacing.md },
                infoEditStyle,
              ]}
            >
              <Text style={[styles.infoBlockTitle, { color: c.text }]}>Контактная информация клиента</Text>
              <View style={[styles.cardRow, styles.cardRowBorder, { borderTopColor: c.border }]}>
                <Text style={[styles.label, { color: c.textSecondary }]}>ФИО</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.value,
                      styles.editableInput,
                      { color: c.text, borderBottomColor: c.border },
                    ]}
                    placeholder="ФИО клиента"
                    placeholderTextColor={c.textSecondary}
                  />
                ) : (
                  <Text style={[styles.value, { color: c.text }]}>—</Text>
                )}
              </View>
              <View style={[styles.cardRow, styles.cardRowBorder, { borderTopColor: c.border }]}>
                <Text style={[styles.label, { color: c.textSecondary }]}>Телефон</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.value,
                      styles.editableInput,
                      { color: c.text, borderBottomColor: c.border },
                    ]}
                    placeholder="+7 (___) ___-__-__"
                    placeholderTextColor={c.textSecondary}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={[styles.value, { color: c.text }]}>—</Text>
                )}
              </View>
              <View style={[styles.cardRow, styles.cardRowBorder, { borderTopColor: c.border }]}>
                <Text style={[styles.label, { color: c.textSecondary }]}>Эл. почта</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.value,
                      styles.editableInput,
                      { color: c.text, borderBottomColor: c.border },
                    ]}
                    placeholder="email@example.com"
                    placeholderTextColor={c.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={[styles.value, { color: c.text }]}>—</Text>
                )}
              </View>
            </Animated.View>
            {/* Смета */}
            <View style={[styles.infoCard, { backgroundColor: c.surface, marginTop: spacing.md }]}>
              <Text style={[styles.infoBlockTitle, { color: c.text }]}>Смета</Text>
              <Text style={[styles.placeholderBlockText, { color: c.textSecondary }]}>Смета по проекту будет отображаться здесь.</Text>
            </View>
            {/* Коммерческое предложение */}
            <View style={[styles.infoCard, { backgroundColor: c.surface, marginTop: spacing.md }]}>
              <Text style={[styles.infoBlockTitle, { color: c.text }]}>Коммерческое предложение</Text>
              <Text style={[styles.placeholderBlockText, { color: c.textSecondary }]}>КП по проекту будет отображаться здесь.</Text>
            </View>
          </>
        )}
        {activeTab === 'visual' && (
          <>
            <Text style={[styles.visualTitle, { color: '#000' }]}>AI‑фото визуализация</Text>
            <View style={[styles.visualCard, { backgroundColor: c.surface }]}>
              {visualStep === 1 && (
                <View>
                  <Text style={[styles.visualStepTitle, { color: c.text }]}>
                    1. Добавьте фотографии из проекта
                  </Text>
                  <Text style={[styles.visualStepSubtitle, { color: c.textSecondary }]}>
                    Мы возьмём исходные фото из столбца «Исходные» во вкладке «Медиа».
                  </Text>
                  <PressableScale
                    style={[styles.visualPrimaryButton, { backgroundColor: '#CDFF07' }]}
                    onPress={handleVisualPickFromMedia}
                  >
                    <Text style={[styles.visualPrimaryButtonText, { color: '#000' }]}>
                      Добавить фотографии из проекта
                    </Text>
                  </PressableScale>
                </View>
              )}

              {visualStep === 2 && (
                <View>
                  <Text style={[styles.visualStepTitle, { color: c.text }]}>
                    2. Выберите референс
                  </Text>
                  <Text style={[styles.visualStepSubtitle, { color: c.textSecondary }]}>
                    Подберите стиль и тип забора, к которому будем стремиться.
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.visualRefsRow}
                  >
                    {['Современный бетон', 'Классический металл', 'Дерево и металл'].map((label) => {
                      const active = visualReference === label;
                      return (
                        <PressableScale
                          key={label}
                          style={[
                            styles.visualRefCard,
                            {
                              backgroundColor: active ? '#CDFF07' : '#F1F4F9',
                              borderColor: active ? '#000' : '#E0E6F0',
                            },
                          ]}
                          onPress={() => {
                            haptic.light();
                            setVisualReference(label);
                          }}
                        >
                          <Ionicons
                            name="images-outline"
                            size={22}
                            color={active ? '#000' : c.textSecondary}
                          />
                          <Text
                            style={[
                              styles.visualRefText,
                              { color: active ? '#000' : c.text },
                            ]}
                            numberOfLines={2}
                          >
                            {label}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </ScrollView>
                  <PressableScale
                    disabled={!visualReference}
                    style={[
                      styles.visualPrimaryButton,
                      {
                        backgroundColor: visualReference ? '#CDFF07' : '#E0E6F0',
                        marginTop: spacing.lg,
                      },
                    ]}
                    onPress={() => {
                      if (!visualReference) return;
                      haptic.light();
                      setVisualStep(3);
                    }}
                  >
                    <Text
                      style={[
                        styles.visualPrimaryButtonText,
                        { color: visualReference ? '#000' : '#8A8F9A' },
                      ]}
                    >
                      Продолжить
                    </Text>
                  </PressableScale>
                </View>
              )}

              {visualStep === 3 && (
                <View>
                  <Text style={[styles.visualStepTitle, { color: c.text }]}>
                    3. Опишите задачу
                  </Text>
                  <Text style={[styles.visualStepSubtitle, { color: c.textSecondary }]}>
                    Например: «Сделать лёгкий полупрозрачный забор с горизонтальными ламелями
                    под дерево».
                  </Text>
                  <TextInput
                    style={[
                      styles.visualPromptInput,
                      { borderColor: c.border, color: c.text },
                    ]}
                    placeholder="Опишите, какой результат вы хотите получить"
                    placeholderTextColor={c.textSecondary}
                    multiline
                    value={visualPrompt}
                    onChangeText={(t) => setVisualPrompt(t)}
                  />
                  <PressableScale
                    disabled={!visualPrompt.trim()}
                    style={[
                      styles.visualPrimaryButton,
                      {
                        backgroundColor: visualPrompt.trim() ? '#CDFF07' : '#E0E6F0',
                      },
                    ]}
                    onPress={handleVisualStartProcessing}
                  >
                    <Text
                      style={[
                        styles.visualPrimaryButtonText,
                        { color: visualPrompt.trim() ? '#000' : '#8A8F9A' },
                      ]}
                    >
                      Запустить визуализацию
                    </Text>
                  </PressableScale>
                </View>
              )}

              {visualStep === 4 && (
                <View style={styles.visualProcessingBlock}>
                  <ActivityIndicator size="large" color="#CDFF07" />
                  <Text style={[styles.visualStepTitle, { color: c.text, marginTop: spacing.md }]}>
                    Выполняем визуализацию…
                  </Text>
                  <Text style={[styles.visualStepSubtitle, { color: c.textSecondary }]}>
                    Это займёт около минуты. Мы подстраиваем забор под выбранный референс
                    и вашу задачу.
                  </Text>
                </View>
              )}

              {visualStep === 5 && (
                <View>
                  <Text style={[styles.visualStepTitle, { color: c.text }]}>
                    4. Готовые визуализации
                  </Text>
                  <Text style={[styles.visualStepSubtitle, { color: c.textSecondary }]}>
                    Эти варианты основаны на ваших исходных фото и выбранном референсе.
                  </Text>
                  <View style={styles.mediaGrid}>
                    {(visualSourcePhotos.length ? visualSourcePhotos : [0, 1, 2]).map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.mediaGridCard,
                          {
                            width: MEDIA_CARD_SIZE,
                            height: MEDIA_CARD_SIZE,
                            backgroundColor: '#000',
                          },
                        ]}
                      >
                        <Ionicons name="image-outline" size={28} color="#CDFF07" />
                      </View>
                    ))}
                  </View>
                  <PressableScale
                    style={[
                      styles.visualPrimaryButton,
                      {
                        backgroundColor: visualAddedToMedia ? '#D2E9D5' : '#CDFF07',
                        marginTop: spacing.lg,
                      },
                    ]}
                    onPress={() => {
                      haptic.light();
                      setVisualAddedToMedia(true);
                    }}
                  >
                    <Text
                      style={[
                        styles.visualPrimaryButtonText,
                        { color: '#000' },
                      ]}
                    >
                      {visualAddedToMedia
                        ? 'Добавлено в медиа проекта'
                        : 'Добавить в медиа проекта'}
                    </Text>
                  </PressableScale>
                </View>
              )}
            </View>
          </>
        )}
        {activeTab === 'kp' && (
          <View style={[styles.placeholderTab, { backgroundColor: c.surface }]}>
            <Ionicons name="document-text-outline" size={40} color={c.textSecondary} />
            <Text style={[styles.placeholderTabText, { color: c.textSecondary }]}>КП</Text>
          </View>
        )}
        {activeTab === 'estimate' && (
          <View style={[styles.placeholderTab, { backgroundColor: c.surface }]}>
            <Ionicons name="calculator-outline" size={40} color={c.textSecondary} />
            <Text style={[styles.placeholderTabText, { color: c.textSecondary }]}>Смета</Text>
          </View>
        )}
        {activeTab === 'documents' && (
          <View style={[styles.placeholderTab, { backgroundColor: c.surface }]}>
            <Ionicons name="document-text-outline" size={40} color={c.textSecondary} />
            <Text style={[styles.placeholderTabText, { color: c.textSecondary }]}>Документы</Text>
          </View>
        )}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: 0,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsScroll: {
    maxHeight: 64,
  },
  tabsRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingRight: spacing.md,
  },
  tabChip: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabChipText: {
    ...typography.label,
    fontSize: 13,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  notFound: {
    ...typography.body,
    padding: spacing.lg,
    textAlign: 'center',
  },
  coverBlock: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  infoCard: {
    borderRadius: 24,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  cardRow: {
    paddingVertical: spacing.sm,
  },
  cardRowBorder: {
    borderTopWidth: 1,
  },
  label: {
    ...typography.caption,
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    ...typography.body,
    fontSize: 16,
  },
  infoBlockTitle: {
    ...typography.headline,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  placeholderBlockText: {
    ...typography.body,
    fontSize: 14,
  },
  mediaBlockWrap: {
    flex: 1,
  },
  mediaBlock: {
    flex: 1,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#69C5F8',
  },
  mediaGridScroll: { flex: 1 },
  mediaGridContent: {},
  mediaGridLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MEDIA_GRID_GAP,
  },
  mediaGridLabelCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaGridLabel: {
    ...typography.headline,
    fontSize: 16,
    fontWeight: '700',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MEDIA_GRID_GAP,
  },
  mediaGridCard: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaFullscreenOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaFullscreenBackdrop: {
    backgroundColor: '#000',
  },
  mediaFullscreenContentWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaFullscreenPhoto: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    aspectRatio: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaFullscreenLabel: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  placeholderTab: {
    borderRadius: COVER_BORDER_RADIUS,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  placeholderTabText: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  visualTitle: {
    ...typography.headline,
    fontSize: 20,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  visualCard: {
    borderRadius: 28,
    padding: spacing.lg,
    minHeight: 280,
  },
  visualStepTitle: {
    ...typography.headline,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  visualStepSubtitle: {
    ...typography.body,
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  visualPrimaryButton: {
    marginTop: spacing.md,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualPrimaryButtonText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
  },
  visualRefsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  visualRefCard: {
    width: 150,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualRefText: {
    ...typography.caption,
    fontSize: 12,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  visualPromptInput: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...typography.body,
    fontSize: 14,
  },
  visualProcessingBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
});
