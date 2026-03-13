import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { getShadow, radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const theme = useColorScheme();
  const c = Colors[theme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptic = useHaptic();
  const { signOut } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [aiTipsEnabled, setAiTipsEnabled] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <PressableScale
          style={[styles.headerBackBtn, { backgroundColor: c.surface }, getShadow('sm') as object]}
          onPress={() => {
            haptic.light();
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </PressableScale>
        <Text style={[styles.headerTitle, { color: c.text }]}>Настройки</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.sectionCard, { backgroundColor: c.surface }, getShadow('sm') as object]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Общие</Text>
          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: c.text }]}>Уведомления</Text>
              <Text style={[styles.rowSubtitle, { color: c.textSecondary }]}>
                Пуши о проектах и погоде
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(val) => {
                haptic.light();
                setNotificationsEnabled(val);
              }}
              trackColor={{ false: '#d0d4dd', true: '#69C5F8' }}
              thumbColor={notificationsEnabled ? '#CDFF07' : '#FFFFFF'}
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: c.text }]}>AI‑Гид</Text>
              <Text style={[styles.rowSubtitle, { color: c.textSecondary }]}>
                Подсказки по забору и участку
              </Text>
            </View>
            <Switch
              value={aiTipsEnabled}
              onValueChange={(val) => {
                haptic.light();
                setAiTipsEnabled(val);
              }}
              trackColor={{ false: '#d0d4dd', true: '#69C5F8' }}
              thumbColor={aiTipsEnabled ? '#CDFF07' : '#FFFFFF'}
            />
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: c.surface }, getShadow('sm') as object]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Аккаунт</Text>
          <PressableScale
            style={styles.row}
            onPress={async () => {
              haptic.medium();
              await signOut();
              router.replace('/login');
            }}
          >
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: '#FF3B30' }]}>Выйти из аккаунта</Text>
              <Text style={[styles.rowSubtitle, { color: c.textSecondary }]}>
                Завершить сессию на этом устройстве
              </Text>
            </View>
            <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
          </PressableScale>
        </View>
      </ScrollView>
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
  headerBackBtn: {
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  sectionCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTextWrap: {
    flex: 1,
    marginRight: spacing.md,
  },
  rowTitle: {
    ...typography.body,
    fontSize: 16,
  },
  rowSubtitle: {
    ...typography.caption,
    fontSize: 13,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E0E6F0',
    marginVertical: spacing.md,
  },
});

