import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FadeIn } from '@/components/ui/FadeIn';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { PressableScale } from '@/components/ui/PressableScale';
import { Skeleton } from '@/components/ui/Skeleton';
import Colors from '@/constants/Colors';
import { getShadow, radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';

const FENCE_OPTIONS = [
  { id: 'forged', name: 'Кованый' },
  { id: 'wood', name: 'Дерево' },
  { id: 'metal', name: 'Металлосайдинг' },
  { id: 'mesh', name: 'Сетка' },
  { id: 'stone', name: 'Камень / Кирпич' },
];

export default function VisualizeUploadScreen() {
  const { source } = useLocalSearchParams<{ source: string }>();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [selectedFence, setSelectedFence] = useState(FENCE_OPTIONS[0].id);
  const theme = useColorScheme();
  const c = Colors[theme];
  const router = useRouter();
  const haptic = useHaptic();

  useEffect(() => {
    (async () => {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setLoading(false);
          return;
        }
        setPicking(true);
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
        });
        setPicking(false);
        if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setLoading(false);
          return;
        }
        setPicking(true);
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
        });
        setPicking(false);
        if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
      }
      setLoading(false);
    })();
  }, [source]);

  const openPicker = async (type: 'camera' | 'gallery') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
    }
  };

  const goToPreview = () => {
    if (!image) return;
    haptic.medium();
    router.push({
      pathname: '/visualize-preview',
      params: { uri: image, fenceId: selectedFence },
    });
  };

  const selectFence = (id: string) => {
    haptic.light();
    setSelectedFence(id);
  };

  if (loading && !image) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        {picking ? (
          <FadeIn>
            <View style={[styles.pickingWrap, { backgroundColor: c.surface }]}>
              <Skeleton width={48} height={48} borderRadius={24} style={{ marginBottom: spacing.md }} />
              <Text style={[styles.pickingText, { color: c.textSecondary }]}>Открываем камеру...</Text>
            </View>
          </FadeIn>
        ) : (
          <FadeInUp>
            <PressableScale
              style={[styles.primaryBtn, { backgroundColor: c.tint }, getShadow('sm') as object]}
              onPress={() => openPicker(source === 'camera' ? 'gallery' : 'camera')}
            >
              <Text style={styles.primaryBtnText}>Выбрать фото</Text>
            </PressableScale>
          </FadeInUp>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {image ? (
          <FadeInUp delay={0}>
            <View style={[styles.imageWrap, { backgroundColor: c.surface, borderColor: c.border }, getShadow('md') as object]}>
              <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
              <PressableScale
                style={[styles.changePhoto, { backgroundColor: c.surfaceElevated }]}
                onPress={() => openPicker(source === 'camera' ? 'gallery' : 'camera')}
              >
                <Text style={[styles.changePhotoText, { color: c.tint }]}>Сменить фото</Text>
              </PressableScale>
            </View>
          </FadeInUp>
        ) : (
          <FadeInUp delay={0}>
            <View style={[styles.placeholder, { backgroundColor: c.border }]}>
              <Text style={[styles.placeholderText, { color: c.textSecondary }]}>Фото не выбрано</Text>
              <PressableScale
                style={[styles.primaryBtn, { backgroundColor: c.tint }]}
                onPress={() => openPicker('gallery')}
              >
                <Text style={styles.primaryBtnText}>Выбрать из галереи</Text>
              </PressableScale>
            </View>
          </FadeInUp>
        )}

        <FadeInUp delay={60}>
          <Text style={[styles.label, { color: c.text }]}>Тип забора</Text>
          <View style={styles.chips}>
            {FENCE_OPTIONS.map((opt) => (
              <PressableScale
                key={opt.id}
                style={[
                  styles.chip,
                  selectedFence === opt.id
                    ? { backgroundColor: c.tint }
                    : { backgroundColor: c.surface, borderColor: c.border },
                ]}
                onPress={() => selectFence(opt.id)}
              >
                <Text style={[styles.chipText, { color: selectedFence === opt.id ? '#fff' : c.text }]}>
                  {opt.name}
                </Text>
              </PressableScale>
            ))}
          </View>
        </FadeInUp>

        <FadeInUp delay={120}>
          <PressableScale
            style={[
              styles.primaryBtn,
              { backgroundColor: c.tint },
              !image && styles.primaryBtnDisabled,
              getShadow('sm') as object,
            ]}
            onPress={goToPreview}
            disabled={!image}
          >
            <Text style={styles.primaryBtnText}>Показать превью с забором</Text>
          </PressableScale>
        </FadeInUp>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  pickingWrap: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  pickingText: { ...typography.bodySmall },
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  imageWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  image: { width: '100%', aspectRatio: 4 / 3 },
  changePhoto: { padding: spacing.sm, alignItems: 'center' },
  changePhotoText: { ...typography.label },
  placeholder: {
    height: 200,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  placeholderText: { ...typography.body },
  label: { ...typography.label, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { ...typography.bodySmall },
  primaryBtn: { paddingVertical: 16, borderRadius: radius.lg, alignItems: 'center' },
  primaryBtnText: { color: '#fff', ...typography.label },
  primaryBtnDisabled: { opacity: 0.5 },
});
