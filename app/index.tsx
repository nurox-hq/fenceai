import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { FadeIn } from '@/components/ui/FadeIn';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { getShadow, spacing } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';
import { useAuth } from '@/contexts/AuthContext';
import { apiRegister, apiSendSmsCode, apiVerifySmsCode } from '@/constants/api';

const WELCOME_KEY = 'fenceai_has_seen_welcome';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
/** Верхняя часть с картинкой и логотипом — ~60–65% экрана */
const TOP_SECTION_HEIGHT = SCREEN_HEIGHT * 0.62;
/** Круг как на экране погоды: верх круга, радиус, размер (смещён вниз на 100px) */
const CIRCLE_TOP = SCREEN_HEIGHT * 0.36 + 100;
const CIRCLE_RADIUS =
  (Math.pow(SCREEN_WIDTH / 2, 2) + Math.pow(SCREEN_HEIGHT - CIRCLE_TOP, 2)) /
  (2 * (SCREEN_HEIGHT - CIRCLE_TOP)) +
  24;
const CIRCLE_SIZE = CIRCLE_RADIUS * 2;
/** Цвет круга */
const CIRCLE_COLOR = '#ffffff';

const REG_STEP_PHONE = 0;
const REG_STEP_SMS = 1;
const REG_STEP_NAME = 2;
const REG_STEP_PASSWORD = 3;
const REG_STEP_BIOMETRIC = 4;
const SMS_COUNTDOWN_SEC = 60;

type PhoneCountry = { iso: string; flag: string; dial: string };
const DEFAULT_COUNTRY: PhoneCountry = { iso: 'RU', flag: '🇷🇺', dial: '+7' };
const COUNTRY_PREFIXES: Array<{ prefixes: string[]; country: PhoneCountry }> = [
  { prefixes: ['7'], country: { iso: 'RU', flag: '🇷🇺', dial: '+7' } },
  { prefixes: ['77'], country: { iso: 'KZ', flag: '🇰🇿', dial: '+7' } },
  { prefixes: ['375'], country: { iso: 'BY', flag: '🇧🇾', dial: '+375' } },
  { prefixes: ['380'], country: { iso: 'UA', flag: '🇺🇦', dial: '+380' } },
  { prefixes: ['998'], country: { iso: 'UZ', flag: '🇺🇿', dial: '+998' } },
  { prefixes: ['994'], country: { iso: 'AZ', flag: '🇦🇿', dial: '+994' } },
  { prefixes: ['995'], country: { iso: 'GE', flag: '🇬🇪', dial: '+995' } },
  { prefixes: ['374'], country: { iso: 'AM', flag: '🇦🇲', dial: '+374' } },
  { prefixes: ['1'], country: { iso: 'US', flag: '🇺🇸', dial: '+1' } },
  { prefixes: ['44'], country: { iso: 'GB', flag: '🇬🇧', dial: '+44' } },
  { prefixes: ['49'], country: { iso: 'DE', flag: '🇩🇪', dial: '+49' } },
  { prefixes: ['33'], country: { iso: 'FR', flag: '🇫🇷', dial: '+33' } },
  { prefixes: ['39'], country: { iso: 'IT', flag: '🇮🇹', dial: '+39' } },
  { prefixes: ['34'], country: { iso: 'ES', flag: '🇪🇸', dial: '+34' } },
  { prefixes: ['48'], country: { iso: 'PL', flag: '🇵🇱', dial: '+48' } },
  { prefixes: ['90'], country: { iso: 'TR', flag: '🇹🇷', dial: '+90' } },
  { prefixes: ['971'], country: { iso: 'AE', flag: '🇦🇪', dial: '+971' } },
  { prefixes: ['91'], country: { iso: 'IN', flag: '🇮🇳', dial: '+91' } },
];

function detectPhoneCountry(rawPhone: string): PhoneCountry {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return DEFAULT_COUNTRY;

  // Longest-prefix match across known country calling codes.
  let best: PhoneCountry | null = null;
  let bestLen = 0;
  for (const entry of COUNTRY_PREFIXES) {
    for (const p of entry.prefixes) {
      if (digits.startsWith(p) && p.length > bestLen) {
        best = entry.country;
        bestLen = p.length;
      }
    }
  }
  return best ?? DEFAULT_COUNTRY;
}

export default function IndexScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const c = Colors[theme ?? 'light'];
  const haptic = useHaptic();
  const { ready: authReady, token, signIn } = useAuth();

  const [registrationMode, setRegistrationMode] = useState(false);
  const [regStep, setRegStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>(DEFAULT_COUNTRY);
  const [smsCode, setSmsCode] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const circleLift = useRef(new Animated.Value(0)).current;
  const handleSmsChange = (text: string) => setSmsCode(text.replace(/\D/g, '').slice(0, 4));
  const smsInputRef = useRef<TextInput>(null);
  const [smsVerifying, setSmsVerifying] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (token) {
      router.replace('/(tabs)/home');
    }
  }, [authReady, token, router]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subShow = Keyboard.addListener(showEvt, (e) => {
      const h = e?.endCoordinates?.height ?? 0;
      const lift = -Math.min(70, Math.round(h * 0.22));
      Animated.timing(circleLift, {
        toValue: lift,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });

    const subHide = Keyboard.addListener(hideEvt, () => {
      Animated.timing(circleLift, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [circleLift]);

  useEffect(() => {
    if (regStep !== REG_STEP_SMS || countdown <= 0) return;
    const t = setInterval(() => setCountdown((s) => (s <= 0 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [regStep, countdown]);

  useEffect(() => {
    if (regStep !== REG_STEP_SMS) return;
    const code = smsCode.replace(/\D/g, '').slice(0, 4);
    if (code.length !== 4) {
      if (smsVerifying) setSmsVerifying(false);
      return;
    }
    if (smsVerifying) return;

    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits) return;

    Keyboard.dismiss();
    setSmsVerifying(true);

    (async () => {
      try {
        await apiVerifySmsCode(phoneDigits, code);
        haptic.medium();
        setRegError('');
        setRegStep(REG_STEP_NAME);
      } catch (e) {
        haptic.light();
        setRegError(e instanceof Error ? e.message : 'Неверный код');
      } finally {
        setSmsVerifying(false);
      }
    })();
  }, [regStep, smsCode, smsVerifying, phone, haptic]);

  useEffect(() => {
    if (!registrationMode || regStep !== REG_STEP_PHONE) return;
    setPhoneCountry(detectPhoneCountry(phone));
  }, [registrationMode, regStep, phone]);

  const formatRuPhone = (nationalDigits: string) => {
    // "+7 (999) 888-77-66" - progressive formatting
    const a = nationalDigits.slice(0, 10);
    const p1 = a.slice(0, 3);
    const p2 = a.slice(3, 6);
    const p3 = a.slice(6, 8);
    const p4 = a.slice(8, 10);

    if (a.length === 0) return '+7 ';
    if (a.length <= 3) return `+7 (${p1}`;
    if (a.length <= 6) return `+7 (${p1}) ${p2}`;
    if (a.length <= 8) return `+7 (${p1}) ${p2}-${p3}`;
    return `+7 (${p1}) ${p2}-${p3}-${p4}`;
  };

  const formatPhone = (country: PhoneCountry, digitsAll: string) => {
    const cc = country.dial.replace(/\D/g, '');
    const national = digitsAll.startsWith(cc) ? digitsAll.slice(cc.length) : digitsAll;
    if (country.iso === 'RU' && cc === '7') return formatRuPhone(national);
    // generic: "+<dial> <rest>"
    if (!digitsAll) return '';
    if (!national) return `${country.dial} `;
    return `${country.dial} ${national}`;
  };

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    // allow starting from first digit "7" -> we keep digits-only and render "+7 ..." mask
    const normalized = digits.startsWith('8') ? `7${digits.slice(1)}` : digits;
    const country = detectPhoneCountry(normalized);
    setPhoneCountry(country);
    setPhone(normalized);
  };

  const phoneDisplay = phone.length > 0 ? formatPhone(phoneCountry, phone) : '';

  const goToLogin = () => {
    haptic.medium();
    AsyncStorage.setItem(WELCOME_KEY, 'true');
    router.replace('/login');
  };

  const goToRegister = () => {
    haptic.medium();
    AsyncStorage.setItem(WELCOME_KEY, 'true');
    setRegistrationMode(true);
    setRegStep(REG_STEP_PHONE);
    setPhone('');
    setPhoneCountry(DEFAULT_COUNTRY);
    setSmsCode('');
    setUserName('');
    setPassword('');
    setRegError('');
    setCountdown(0);
  };

  const backToWelcome = useCallback(() => {
    haptic.light();
    setRegistrationMode(false);
    setRegStep(0);
    setRegError('');
  }, []);

  const canContinuePhone = phone.replace(/\D/g, '').length >= 11;
  const canContinueSms = smsCode.replace(/\D/g, '').length >= 4;
  const canContinueName = userName.trim().length > 0;
  const canContinuePassword = password.length >= 6;

  const onContinuePhone = async () => {
    if (!canContinuePhone || smsSending) return;
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits) return;

    setRegError('');
    setSmsCode('');
    setCountdown(0);
    setSmsSending(true);

    try {
      await apiSendSmsCode(phoneDigits);
      haptic.medium();
      setRegStep(REG_STEP_SMS);
      setCountdown(SMS_COUNTDOWN_SEC);
      // откроем клавиатуру сразу на поле кода
      requestAnimationFrame(() => smsInputRef.current?.focus());
    } catch (e) {
      haptic.light();
      setRegError(e instanceof Error ? e.message : 'Не удалось отправить код, попробуйте ещё раз');
    } finally {
      setSmsSending(false);
    }
  };

  const onContinueSms = () => {
    if (!canContinueSms || smsVerifying) return;
    haptic.medium();
    setRegError('');
    setRegStep(REG_STEP_NAME);
  };

  const onResendCode = () => {
    haptic.medium();
    setCountdown(SMS_COUNTDOWN_SEC);
  };

  const onContinueName = () => {
    if (!canContinueName) return;
    haptic.medium();
    setRegError('');
    setRegStep(REG_STEP_PASSWORD);
  };

  const onContinuePassword = () => {
    if (!canContinuePassword) return;
    haptic.medium();
    setRegError('');
    setRegStep(REG_STEP_BIOMETRIC);
  };

  const finishRegistration = useCallback(
    async (enableBiometric: boolean) => {
      setRegLoading(true);
      setRegError('');
      try {
        const email = `${phone.trim().replace(/\D/g, '')}@fenceai.local`;
        const { token: newToken, user } = await apiRegister(email, password, userName.trim() || undefined);
        if (enableBiometric) {
          try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (hasHardware && isEnrolled) {
              const res = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Подключите биометрию для входа',
                cancelLabel: 'Пропустить',
              });
              if (!res.success) {
                // если пользователь отменил — просто не включаем биометрию
                enableBiometric = false;
              }
            } else {
              enableBiometric = false;
            }
          } catch {
            enableBiometric = false;
          }
        }

        if (enableBiometric) {
          await AsyncStorage.setItem(`fenceai_bio_${user.id}`, '1');
        } else {
          await AsyncStorage.removeItem(`fenceai_bio_${user.id}`);
        }

        haptic.medium();
        await signIn(newToken, user);
        await AsyncStorage.setItem(WELCOME_KEY, 'true');
        router.replace('/(tabs)/home');
      } catch (e) {
        haptic.light();
        setRegError(e instanceof Error ? e.message : 'Ошибка регистрации');
      } finally {
        setRegLoading(false);
      }
    },
    [phone, password, userName, signIn, router]
  );

  if (!authReady) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <FadeIn>
          <Text style={{ color: c.text }}>Загрузка…</Text>
        </FadeIn>
      </View>
    );
  }

  if (token) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <Text style={{ color: c.text }}>Загрузка…</Text>
      </View>
    );
  }

  const renderCircleContent = () => {
    if (!registrationMode) {
      return (
        <>
          <View style={styles.welcomeTextBlock}>
            <FadeInUp delay={200}>
              <Text style={[styles.welcomeTitle, { color: c.tabBarBg }]}>ДОБРО ПОЖАЛОВАТЬ</Text>
            </FadeInUp>
            <FadeInUp delay={260}>
              <Text style={[styles.welcomeDesc, { color: c.tabBarBg }]}>
                Визуализация заборов и ограждений на участке.{'\n'}
                Превью для клиентов и видеооблёты за минуты.
              </Text>
            </FadeInUp>
          </View>
          <View style={styles.welcomeSpacer} />
          <View style={styles.welcomeButtonsBlock}>
            <FadeInUp delay={340}>
              <PressableScale
                style={[styles.btnPrimary, { backgroundColor: c.tabBarBg }, getShadow('sm') as object]}
                onPress={goToLogin}
              >
                <Text style={styles.btnPrimaryText}>Войти</Text>
              </PressableScale>
            </FadeInUp>
            <FadeInUp delay={400}>
              <PressableScale
                style={[styles.btnSecondary, { borderColor: c.tabBarBg }]}
                onPress={goToRegister}
              >
                <Text style={[styles.btnSecondaryText, { color: c.tabBarBg }]}>Регистрация</Text>
              </PressableScale>
            </FadeInUp>
          </View>
        </>
      );
    }

    const inputStyle = [styles.regInput, { backgroundColor: c.surface, color: c.text, borderColor: c.border }];
    const titleStyle = [styles.regStepTitle, { color: c.tabBarBg }];

    if (regStep === REG_STEP_PHONE) {
      return (
        <>
          <Pressable style={styles.regBack} onPress={backToWelcome}>
            <Text style={[styles.regBackText, { color: c.tabBarBg }]}>← Назад</Text>
          </Pressable>
          <View style={styles.regStepBlock}>
            <Text style={titleStyle}>Введите номер телефона</Text>
            <View
              style={[
                styles.regPhoneRow,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <Text style={styles.regPhoneFlag}>{phoneCountry.flag}</Text>
              <TextInput
                style={[styles.regPhoneInput, { color: c.text }]}
                placeholder="+7 (999) 123-45-67"
                placeholderTextColor={c.textSecondary}
                value={phoneDisplay}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>
          </View>
          <View style={styles.welcomeSpacer} />
          <View style={styles.welcomeButtonsBlock}>
            {regError ? <Text style={[styles.regError, { color: '#c62828' }]}>{regError}</Text> : null}
            <PressableScale
              style={[styles.btnPrimary, { backgroundColor: canContinuePhone ? c.tabBarBg : c.border }, getShadow('sm') as object]}
              onPress={onContinuePhone}
              disabled={!canContinuePhone || smsSending}
            >
              <Text style={styles.btnPrimaryText}>{smsSending ? 'Отправка…' : 'Продолжить'}</Text>
            </PressableScale>
          </View>
        </>
      );
    }

    if (regStep === REG_STEP_SMS) {
      const codeDigits = smsCode.replace(/\D/g, '').slice(0, 4);
      return (
        <>
          <Pressable style={styles.regBack} onPress={() => { haptic.light(); setRegStep(REG_STEP_PHONE); }}>
            <Text style={[styles.regBackText, { color: c.tabBarBg }]}>← Назад</Text>
          </Pressable>
          <View style={styles.regStepBlock}>
            <Text style={titleStyle}>Введите код из SMS</Text>
            <Pressable
              style={[styles.regCodeField, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => smsInputRef.current?.focus()}
            >
              <View style={styles.regCodeSlots} pointerEvents="none">
                {Array.from({ length: 4 }).map((_, i) => (
                  <View key={i} style={[styles.regCodeSlot, { borderBottomColor: c.tabBarBg }]}>
                    <Text style={[styles.regCodeDigit, { color: c.tabBarBg }]}>
                      {codeDigits[i] ?? ''}
                    </Text>
                  </View>
                ))}
              </View>
              {smsVerifying ? (
                <View style={styles.regCodeSpinner} pointerEvents="none">
                  <ActivityIndicator size="small" color={c.tabBarBg} />
                </View>
              ) : null}
              <TextInput
                ref={smsInputRef}
                style={styles.regCodeHiddenInput}
                value={codeDigits}
                onChangeText={handleSmsChange}
                keyboardType="number-pad"
                maxLength={4}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
              />
            </Pressable>
            <Text style={[styles.regCountdown, { color: c.tabBarBg }]}>
              {countdown > 0 ? `Повторная отправка через ${countdown} сек` : ''}
            </Text>
            {countdown <= 0 && (
              <PressableScale style={styles.regResendBtn} onPress={onResendCode}>
                <Text style={[styles.regResendText, { color: c.tabBarBg }]}>Код не пришёл</Text>
              </PressableScale>
            )}
          </View>
          <View style={styles.welcomeSpacer} />
          <View style={styles.welcomeButtonsBlock}>
            <PressableScale
              style={[styles.btnPrimary, { backgroundColor: canContinueSms ? c.tabBarBg : c.border }, getShadow('sm') as object]}
              onPress={onContinueSms}
              disabled={!canContinueSms || smsVerifying}
            >
              <Text style={styles.btnPrimaryText}>{smsVerifying ? 'Проверка…' : 'Продолжить'}</Text>
            </PressableScale>
          </View>
        </>
      );
    }

    if (regStep === REG_STEP_NAME) {
      return (
        <>
          <Pressable style={styles.regBack} onPress={() => { haptic.light(); setRegStep(REG_STEP_SMS); }}>
            <Text style={[styles.regBackText, { color: c.tabBarBg }]}>← Назад</Text>
          </Pressable>
          <View style={styles.regStepBlock}>
            <Text style={titleStyle}>Введите ваше имя</Text>
            <TextInput
              style={inputStyle}
              placeholder="Имя"
              placeholderTextColor={c.textSecondary}
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.welcomeSpacer} />
          <View style={styles.welcomeButtonsBlock}>
            <PressableScale
              style={[styles.btnPrimary, { backgroundColor: canContinueName ? c.tabBarBg : c.border }, getShadow('sm') as object]}
              onPress={onContinueName}
              disabled={!canContinueName}
            >
              <Text style={styles.btnPrimaryText}>Продолжить</Text>
            </PressableScale>
          </View>
        </>
      );
    }

    if (regStep === REG_STEP_PASSWORD) {
      return (
        <>
          <Pressable style={styles.regBack} onPress={() => { haptic.light(); setRegStep(REG_STEP_NAME); }}>
            <Text style={[styles.regBackText, { color: c.tabBarBg }]}>← Назад</Text>
          </Pressable>
          <View style={styles.regStepBlock}>
            <Text style={titleStyle}>Придумайте пароль</Text>
            <TextInput
              style={inputStyle}
              placeholder="Не менее 6 символов"
              placeholderTextColor={c.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <View style={styles.welcomeSpacer} />
          <View style={styles.welcomeButtonsBlock}>
            <PressableScale
              style={[styles.btnPrimary, { backgroundColor: canContinuePassword ? c.tabBarBg : c.border }, getShadow('sm') as object]}
              onPress={onContinuePassword}
              disabled={!canContinuePassword}
            >
              <Text style={styles.btnPrimaryText}>Продолжить</Text>
            </PressableScale>
          </View>
        </>
      );
    }

    if (regStep === REG_STEP_BIOMETRIC) {
      return (
        <>
          <Pressable style={styles.regBack} onPress={() => { haptic.light(); setRegStep(REG_STEP_PASSWORD); }}>
            <Text style={[styles.regBackText, { color: c.tabBarBg }]}>← Назад</Text>
          </Pressable>
          <View style={styles.regStepBlock}>
            <Text style={titleStyle}>Подключите биометрическую 2FA</Text>
            <Text style={[styles.regBiometricDesc, { color: c.tabBarBg }]}>
              Для авторизации в приложении и защиты от взлома
            </Text>
          </View>
          <View style={styles.welcomeSpacer} />
          <View style={styles.welcomeButtonsBlock}>
            {regError ? <Text style={[styles.regError, { color: '#c62828' }]}>{regError}</Text> : null}
            <PressableScale
              style={[styles.btnPrimary, { backgroundColor: c.tabBarBg }, getShadow('sm') as object]}
              onPress={() => finishRegistration(true)}
              disabled={regLoading}
            >
              <Text style={styles.btnPrimaryText}>{regLoading ? 'Создание аккаунта…' : 'Продолжить'}</Text>
            </PressableScale>
            <PressableScale
              style={[styles.btnSecondary, { borderColor: c.tabBarBg, marginTop: spacing.sm }]}
              onPress={() => finishRegistration(false)}
              disabled={regLoading}
            >
              <Text style={[styles.btnSecondaryText, { color: c.tabBarBg }]}>Пропустить</Text>
            </PressableScale>
          </View>
        </>
      );
    }

    return null;
  };

  const content = (
    <View style={styles.container}>
      {/* Tap outside inputs to dismiss keyboard (doesn't steal TextInput touches) */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={Keyboard.dismiss}
        accessible={false}
      />
      {/* Верх: фото + логотип */}
      <View style={[styles.topSection, { height: TOP_SECTION_HEIGHT }]}>
        <ImageBackground
          source={require('@/assets/images/welcome-hero.png')}
          style={styles.topImage}
          resizeMode="cover"
        >
          <View style={styles.logoOverlay}>
            <FadeIn duration={400}>
              <View style={[styles.logoCircle, getShadow('md') as object]}>
                <Text style={styles.logoCircleLabel}>FENCE AI</Text>
                <Text style={styles.logoCircleSub}>Визуализация заборов</Text>
              </View>
            </FadeIn>
            <FadeIn delay={120} duration={400}>
              <Text style={styles.brandTitle}>FENCE</Text>
            </FadeIn>
            <FadeIn delay={180} duration={400}>
              <Text style={styles.brandSub}>Визуализация заборов</Text>
            </FadeIn>
          </View>
        </ImageBackground>
      </View>

      <Animated.View style={[styles.circleLayer, { transform: [{ translateY: circleLift }] }]}>
        {/* Tap on empty space inside circle layer to dismiss keyboard */}
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={Keyboard.dismiss}
          accessible={false}
        />
        <View style={[styles.circleWrap, { top: CIRCLE_TOP }]}>
          <View
            style={[
              styles.circle,
              { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_RADIUS, backgroundColor: CIRCLE_COLOR },
            ]}
          />
        </View>
        <View style={[styles.circleClip, { top: CIRCLE_TOP }]} pointerEvents="box-none">
          <View style={styles.circleContent}>{renderCircleContent()}</View>
        </View>
      </Animated.View>
    </View>
  );

  return registrationMode ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardWrapper}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  keyboardWrapper: {
    flex: 1,
  },
  circleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  topSection: {
    width: '100%',
    overflow: 'hidden',
  },
  topImage: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  logoCircleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  logoCircleSub: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  circleWrap: {
    position: 'absolute',
    left: (SCREEN_WIDTH - CIRCLE_SIZE) / 2,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  circle: {},
  circleClip: {
    position: 'absolute',
    left: (SCREEN_WIDTH - CIRCLE_SIZE) / 2,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_RADIUS,
    overflow: 'hidden',
  },
  circleContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 46,
    paddingBottom: spacing.xxl,
  },
  welcomeTextBlock: {},
  welcomeSpacer: { height: 32 },
  welcomeButtonsBlock: {},
  regBack: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  regBackText: { fontSize: 15, fontWeight: '500' },
  regStepBlock: {},
  regStepTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  regInput: {
    borderWidth: 1.5,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    fontSize: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
  },
  regPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    alignSelf: 'center',
    width: 320,
    maxWidth: 320,
  },
  regPhoneFlag: { fontSize: 18, marginRight: 10 },
  regPhoneInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
  },
  regCodeField: {
    borderWidth: 1.5,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
  },
  regCodeSlots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    paddingRight: 34, // space for spinner
  },
  regCodeSlot: {
    flex: 1,
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingBottom: 6,
    minWidth: 44,
  },
  regCodeDigit: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  regCodeSpinner: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regCodeHiddenInput: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  regCountdown: { fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
  regResendBtn: { marginTop: spacing.md, alignSelf: 'center' },
  regResendText: { fontSize: 15, fontWeight: '600' },
  regError: { fontSize: 13, textAlign: 'center', marginBottom: spacing.sm },
  regBiometricDesc: { fontSize: 14, textAlign: 'center', opacity: 0.9, marginTop: spacing.xs },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  welcomeDesc: {
    fontSize: 15,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  btnPrimary: {
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: 28,
    alignItems: 'center',
    alignSelf: 'center',
    width: 200,
    minWidth: 200,
    marginBottom: spacing.md,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  btnSecondary: {
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: 28,
    alignItems: 'center',
    alignSelf: 'center',
    width: 200,
    minWidth: 200,
    borderWidth: 1.5,
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
