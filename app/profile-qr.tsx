import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { API_BASE } from '@/constants/api';
import { getShadow, radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptic } from '@/hooks/useHaptic';

export default function ProfileQrScreen() {
  const theme = useColorScheme();
  const c = Colors[theme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptic = useHaptic();
  const { user } = useAuth();

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setError('Нет данных профиля');
        return;
      }
      try {
        setError(null);
        const token = await AsyncStorage.getItem('fenceai_auth_token');
        const res = await fetch(`${API_BASE}/api/auth/qr/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Ошибка ${res.status}`);
        if (cancelled) return;
        setQrCode(data.code as string);
        if (data.expiresAt) {
          const ms = Date.parse(data.expiresAt as string);
          if (Number.isFinite(ms)) {
            setExpiresAtMs(ms);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Не удалось создать QR‑код');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!expiresAtMs) return;
    let cancelled = false;
    const update = () => {
      const diff = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      if (!cancelled) setSecondsLeft(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [expiresAtMs]);

  const qrImageUri = qrCode ? `${API_BASE}/api/auth/qr/image/${qrCode}` : null;

  return (
    <View style={[styles.container, { backgroundColor: '#69C5F8' }]}>
      <PressableScale
        style={[
          styles.headerBackBtn,
          { backgroundColor: '#CDFF07', top: insets.top + spacing.sm, left: spacing.md },
          getShadow('sm') as object,
        ]}
        onPress={() => {
          haptic.light();
          router.back();
        }}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={c.text}
          style={styles.headerBackIcon}
        />
      </PressableScale>

      <View style={styles.content}>
        <View style={[styles.qrCard, { backgroundColor: c.surface }, getShadow('md') as object]}>
          <View style={styles.qrOuter}>
            <View style={styles.qrInner}>
              {qrImageUri ? (
                <Image
                  source={{ uri: qrImageUri }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <>
                  <View style={styles.qrCorner} />
                  <View style={[styles.qrCorner, styles.qrCornerTopRight]} />
                  <View style={[styles.qrCorner, styles.qrCornerBottomLeft]} />
                  <View style={[styles.qrCorner, styles.qrCornerBottomRight]} />
                  <Text style={styles.qrPlaceholder}>
                    {error ?? 'Создание QR‑кода…'}
                  </Text>
                </>
              )}
            </View>
          </View>
          <Text style={[styles.qrHint, { color: c.textSecondary }]}>
            Отсканируйте этот QR‑код для быстрого входа в аккаунт на другом устройстве
          </Text>
        </View>

        <View style={styles.meta}>
          {secondsLeft != null && secondsLeft > 0 ? (
            <>
              <Text style={[styles.countdownLabel, { color: '#FFFFFF' }]}>
                QR‑код действителен
              </Text>
              <Text style={[styles.countdownValue, { color: '#FFFFFF' }]}>
                {`${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60)
                  .toString()
                  .padStart(2, '0')}`}
              </Text>
            </>
          ) : (
            <Text style={[styles.countdownLabel, { color: '#FFFFFF' }]}>
              QR‑код истёк, обновите экран
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackIcon: {
    marginLeft: 1,
  },
  headerTitle: {
    ...typography.titleLarge,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  qrCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  qrOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  qrInner: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 176,
    height: 176,
    borderRadius: radius.sm,
  },
  qrCorner: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#69C5F8',
    top: 0,
    left: 0,
  },
  qrCornerTopRight: {
    top: 0,
    right: 0,
    left: undefined,
  },
  qrCornerBottomLeft: {
    bottom: 0,
    top: undefined,
    left: 0,
  },
  qrCornerBottomRight: {
    bottom: 0,
    right: 0,
    top: undefined,
    left: undefined,
  },
  qrPlaceholder: {
    ...typography.titleLarge,
    fontSize: 32,
    color: '#CDFF07',
  },
  qrHint: {
    ...typography.caption,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  meta: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  countdownLabel: {
    ...typography.caption,
    fontSize: 13,
  },
  countdownValue: {
    ...typography.titleLarge,
    fontSize: 28,
    marginTop: 4,
  },
});

