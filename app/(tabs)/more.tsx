import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarRing, { backgroundColor: c.surface }, getShadow('sm') as object]}>
            <View style={[styles.avatarCircle, { backgroundColor: c.border }]}>
              <Ionicons name="person" size={56} color={c.textSecondary} />
            </View>
          </View>
        </View>
        <Text style={[styles.profileName, { color: c.text }]} numberOfLines={1}>
          {user?.name || user?.email || 'Профиль'}
        </Text>
        {/* Карточка аккаунта */}
        <View style={[styles.accountCard, { backgroundColor: c.surface }, getShadow('sm') as object]}>
          <Text style={[styles.accountTitle, { color: c.text }]}>Аккаунт</Text>
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
        </View>

        <Pressable style={[styles.logoutBtn, { borderColor: c.border }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={c.textSecondary} />
          <Text style={[styles.logoutText, { color: c.textSecondary }]}>Выйти</Text>
        </Pressable>
      </ScrollView>
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
  avatarWrap: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
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
  profileName: { ...typography.title, marginTop: spacing.md },
  accountCard: {
    width: '100%',
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  accountTitle: {
    ...typography.label,
    fontSize: 14,
    marginBottom: spacing.md,
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
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  logoutText: { ...typography.label },
});
