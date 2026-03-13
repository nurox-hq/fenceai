import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { PressableScale } from '@/components/ui/PressableScale';
import Colors from '@/constants/Colors';
import { spacing, radius, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';

type Message = {
  id: string;
  from: 'user' | 'ai';
  text: string;
};

export default function AssistantScreen() {
  const theme = useColorScheme();
  const c = Colors[theme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptic = useHaptic();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      from: 'ai',
      text: 'Я AI‑ассистент FenceAI. Помогу подобрать забор под ваш участок, рассчитать стоимость и связать это с текущими проектами.',
    },
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    haptic.light();
    const userMsg: Message = { id: String(Date.now()), from: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Пока заглушка-ответ: объясняет, что ассистент интегрирован с проектами/визуализацией
    const aiMsg: Message = {
      id: `${userMsg.id}-ai`,
      from: 'ai',
      text:
        'Спасибо за запрос. На основе данных о ваших проектах и визуализациях я могу подсказать тип забора, диапазон стоимости и предложить, какой проект обновить. В следующей версии сюда будет подключен полноценный GPT‑мозг.',
    };
    setMessages((prev) => [...prev, aiMsg]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <PressableScale
          style={[styles.headerBtn, { backgroundColor: c.surface }]}
          onPress={() => {
            haptic.light();
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </PressableScale>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: c.text }]}>AI‑ассистент</Text>
          <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
            Специалист по заборам и вашим проектам
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 80}
      >
        <ScrollView
          style={styles.messages}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, index) => (
            <FadeInUp key={m.id} delay={index * 40}>
              <View
                style={[
                  styles.bubbleRow,
                  m.from === 'user' ? styles.bubbleRowUser : styles.bubbleRowAi,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    m.from === 'user'
                      ? { backgroundColor: c.tint }
                      : { backgroundColor: c.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: m.from === 'user' ? '#fff' : c.text },
                    ]}
                  >
                    {m.text}
                  </Text>
                </View>
              </View>
            </FadeInUp>
          ))}
        </ScrollView>

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm,
              backgroundColor: c.background,
            },
          ]}
        >
          <View style={[styles.inputFieldWrap, { backgroundColor: c.surface }]}>
            <TextInput
              style={[styles.inputField, { color: c.text }]}
              placeholder="Опишите задачу по забору или проекту…"
              placeholderTextColor={c.textSecondary}
              value={input}
              onChangeText={setInput}
              multiline
            />
          </View>
          <PressableScale
            style={[styles.sendBtn, { backgroundColor: input.trim() ? c.tint : c.surface }]}
            disabled={!input.trim()}
            onPress={sendMessage}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={input.trim() ? '#fff' : c.textSecondary}
            />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  headerTitle: {
    ...typography.titleLarge,
    fontSize: 20,
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  messages: {
    flex: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAi: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  inputFieldWrap: {
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    marginRight: spacing.sm,
  },
  inputField: {
    ...typography.body,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

