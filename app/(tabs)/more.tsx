import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { getShadow, radius, spacing, tabBarFloating, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptic } from '@/hooks/useHaptic';

export default function ProfileScreen() {
  const theme = useColorScheme();
  const c = Colors[theme];
  const insets = useSafeAreaInsets();
  const haptic = useHaptic();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);

  const handleLogout = () => {
    haptic.light();
    signOut();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.homeBackground }]}>
      {/* Верх: слева QR, справа настройки — без шапки */}
      <View style={[styles.headerRow, { paddingTop: insets.top + spacing.md }]}>
        <PressableScale
          style={[
            styles.headerRoundBtn,
            { backgroundColor: '#69C5F8' },
            getShadow('sm') as object,
          ]}
          onPress={() => {
            haptic.light();
            router.push('/profile-qr');
          }}
        >
          <Ionicons name="qr-code-outline" size={24} color={c.text} />
        </PressableScale>
        <View style={{ flex: 1 }} />
        <PressableScale
          style={[
            styles.headerRoundBtn,
            { backgroundColor: '#69C5F8' },
            getShadow('sm') as object,
          ]}
          onPress={() => {
            haptic.light();
            router.push('/settings');
          }}
        >
          <Ionicons name="settings-outline" size={24} color={c.text} />
        </PressableScale>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarFloating.contentPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Круг с аватаркой по центру */}
        <Pressable
          style={styles.avatarWrap}
          onPress={() => {
            haptic.light();
            setAvatarMenuVisible(true);
          }}
        >
          <View style={[styles.avatarRing, { backgroundColor: c.surface }, getShadow('sm') as object]}>
            <View style={[styles.avatarCircle, { backgroundColor: c.border }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={56} color={c.textSecondary} />
              )}
            </View>
          </View>
        </Pressable>
        <Text style={[styles.profileName, { color: c.text }]} numberOfLines={1}>
          {user?.name || user?.email || 'Профиль'}
        </Text>
        {/* Карточка аккаунта и телефона */}
        <View style={[styles.accountCard, { backgroundColor: c.surface }, getShadow('sm') as object]}>
          <View style={styles.accountRow}>
            <Text style={[styles.accountLabel, { color: c.textSecondary }]}>Имя</Text>
            <Text style={[styles.accountValue, { color: c.text }]}>
              {user?.name || 'Не указано'}
            </Text>
          </View>
          <View style={styles.accountRow}>
            <Text style={[styles.accountLabel, { color: c.textSecondary }]}>Логин</Text>
            <Text style={[styles.accountValue, { color: c.text }]}>
              {user?.email || '—'}
            </Text>
          </View>
          <View style={[styles.accountDivider, { borderBottomColor: c.border }]} />
          <View style={styles.accountRowColumn}>
            <Text style={[styles.accountLabel, { color: c.textSecondary }]}>Телефон</Text>
            <Text style={[styles.accountValue, { color: c.text }]}>+7 (___) ___‑__‑__</Text>
          </View>
          <View style={styles.accountRowColumn}>
            <Text style={[styles.accountLabel, { color: c.textSecondary }]}>Дополнительная информация</Text>
            <Text style={[styles.accountValue, { color: c.textSecondary }]}>—</Text>
          </View>
        </View>

        {/* Статистика проектов */}
        <View style={[styles.statsCard, { backgroundColor: c.surface }, getShadow('sm') as object]}>
          <View style={styles.statsRow}>
            <View style={styles.statsCol}>
              <Text style={[styles.statsLabel, { color: c.textSecondary }]}>Активно</Text>
              <Text style={[styles.statsValue, { color: c.text }]}>0</Text>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsCol}>
              <Text style={[styles.statsLabel, { color: c.textSecondary }]}>Завершено</Text>
              <Text style={[styles.statsValue, { color: c.text }]}>0</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={avatarMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarMenuVisible(false)}
      >
        <Pressable
          style={styles.avatarMenuOverlay}
          onPress={() => setAvatarMenuVisible(false)}
        >
          <View style={[styles.avatarMenu, { backgroundColor: c.surface }]}>
            <PressableScale
              style={styles.avatarMenuItem}
              onPress={async () => {
                haptic.light();
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') return;
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  allowsEditing: true,
                  aspectRatio: [1, 1],
                });
                if (!result.canceled && result.assets[0]) {
                  setAvatarUri(result.assets[0].uri);
                }
                setAvatarMenuVisible(false);
              }}
            >
              <Text style={[styles.avatarMenuText, { color: c.text }]}>
                {avatarUri ? 'Изменить фото профиля' : 'Добавить фото профиля'}
              </Text>
            </PressableScale>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  headerRoundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingHorizontal: spacing.md },
  avatarWrap: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileName: { ...typography.title, marginTop: spacing.md },
  accountCard: {
    width: '100%',
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  accountLabel: {
    ...typography.caption,
    fontSize: 13,
  },
  accountValue: {
    ...typography.bodySmall,
    fontSize: 14,
  },
  accountDivider: {
    borderBottomWidth: 1,
    marginVertical: spacing.md,
  },
  accountRowColumn: {
    marginTop: spacing.sm,
  },
  statsCard: {
    width: '100%',
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsCol: {
    flex: 1,
    alignItems: 'center',
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E6F0',
    marginHorizontal: spacing.md,
  },
  statsLabel: {
    ...typography.caption,
    fontSize: 12,
  },
  statsValue: {
    ...typography.headline,
    fontSize: 18,
    marginTop: 4,
  },
  avatarMenuOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  avatarMenu: {
    minWidth: 260,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
  },
  avatarMenuItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  avatarMenuText: {
    ...typography.body,
    fontSize: 15,
  },
});
