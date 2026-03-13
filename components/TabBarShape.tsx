import { Ionicons } from '@expo/vector-icons';
import type { Ionicons as IconName } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';
import { tabBarFloating } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useHaptic } from '@/hooks/useHaptic';

const GLOW_SPREAD = 8;

const TABS: { name: string; route: string; icon: keyof typeof IconName.glyphMap }[] = [
  { name: 'Главная', route: '/(tabs)/home', icon: 'home' },
  { name: 'Проекты', route: '/(tabs)/projects', icon: 'folder-outline' },
  { name: 'Визуализация', route: '/(tabs)/visualize', icon: 'camera-outline' },
  { name: 'Каталог', route: '/(tabs)/catalog', icon: 'grid-outline' },
  { name: 'Ещё', route: '/(tabs)/more', icon: 'person-outline' },
];

/**
 * Форма таббара — «таблетка» по центру снизу с иконками вкладок и навигацией.
 */
export function TabBarShape() {
  const c = Colors[useColorScheme()];
  const pathname = usePathname();
  const router = useRouter();
  const haptic = useHaptic();
  const bottom = tabBarFloating.bottom;

  const barStyle = {
    position: 'absolute' as const,
    bottom,
    left: tabBarFloating.horizontal,
    right: tabBarFloating.horizontal,
    height: tabBarFloating.height,
    borderRadius: tabBarFloating.borderRadius,
    backgroundColor: c.tabBarBg,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: c.tabBarBg,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        }
      : { elevation: 8 }),
  };

  const handleTabPress = (route: string) => {
    haptic.light();
    router.push(route as any);
  };

  return (
    <>
      {/* На Android — слой «свечения» под основной формой */}
      {Platform.OS === 'android' && (
        <View
          style={{
            position: 'absolute',
            bottom: bottom - GLOW_SPREAD / 2,
            left: tabBarFloating.horizontal - GLOW_SPREAD,
            right: tabBarFloating.horizontal - GLOW_SPREAD,
            height: tabBarFloating.height + GLOW_SPREAD,
            borderRadius: tabBarFloating.borderRadius + GLOW_SPREAD / 2,
            backgroundColor: c.tabBarBg,
            opacity: 0.25,
          }}
        />
      )}
      <View style={barStyle} />
      {/* Иконки вкладок поверх формы, центрированы */}
      <View
        style={[
          styles.iconsRow,
          {
            bottom,
            left: tabBarFloating.horizontal,
            right: tabBarFloating.horizontal,
            height: tabBarFloating.height,
          },
        ]}
        pointerEvents="box-none"
      >
        {TABS.map((tab) => {
          const segment = tab.route.replace('/(tabs)/', '');
          const active =
            pathname === tab.route ||
            pathname.endsWith(segment) ||
            pathname.endsWith('/' + segment);
          const color = active ? '#000000' : c.tabBarIconInactive;
          return (
            <Pressable
              key={tab.route}
              style={[styles.iconWrap, active && styles.iconWrapActive]}
              onPress={() => handleTabPress(tab.route)}
              accessibilityRole="button"
              accessibilityLabel={tab.name}
            >
              <Ionicons name={tab.icon} size={26} color={color} />
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  iconsRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 4,
  },
  iconWrap: {
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CDFF07',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
