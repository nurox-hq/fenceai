import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { apiRegister } from '@/constants/api';
import { getShadow, radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useColorScheme();
  const c = Colors[theme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptic = useHaptic();
  const { signIn } = useAuth();

  const handleRegister = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!digits || !password) {
      setError('Введите номер телефона и пароль');
      return;
    }
    if (password.length < 6) {
      setError('Пароль не менее 6 символов');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const syntheticEmail = `${digits}@fenceai.local`;
      const { token, user } = await apiRegister(syntheticEmail, password, name.trim() || undefined);
      haptic.medium();
      await signIn(token, user);
      router.replace('/(tabs)/home');
    } catch (e) {
      haptic.light();
      setError(e instanceof Error ? e.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.content, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Регистрация</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Создайте аккаунт для работы в приложении
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Имя (необязательно)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
            placeholder="Как к вам обращаться"
            placeholderTextColor={c.textSecondary}
            value={name}
            onChangeText={(t) => { setName(t); setError(''); }}
            editable={!loading}
          />
          <Text style={[styles.label, { color: c.textSecondary }]}>Номер телефона</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
            placeholder="+7 (___) ___-__-__"
            placeholderTextColor={c.textSecondary}
            value={phone}
            onChangeText={(t) => { setPhone(t); setError(''); }}
            keyboardType="phone-pad"
            editable={!loading}
          />
          <Text style={[styles.label, { color: c.textSecondary }]}>Пароль (не менее 6 символов)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
            placeholder="••••••••"
            placeholderTextColor={c.textSecondary}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(''); }}
            secureTextEntry
            editable={!loading}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PressableScale
            style={[styles.btn, { backgroundColor: c.tabBarBg }, getShadow('sm') as object]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnText}>Зарегистрироваться</Text>
            )}
          </PressableScale>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.textSecondary }]}>Уже есть аккаунт? </Text>
          <Pressable
            onPress={() => {
              haptic.light();
              router.back();
            }}
            disabled={loading}
          >
            <Text style={[styles.footerLink, { color: c.tint }]}>Войти</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
  header: { marginBottom: spacing.xl },
  title: { ...typography.titleLarge, marginBottom: spacing.sm },
  subtitle: { ...typography.bodySmall },
  form: { gap: 0 },
  label: { ...typography.caption, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  error: { color: '#c0392b', fontSize: 14, marginTop: spacing.sm },
  btn: {
    marginTop: spacing.xl,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnText: { color: '#fff', ...typography.label, fontSize: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { ...typography.bodySmall },
  footerLink: { ...typography.label },
});
