import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { TabBarShape } from '@/components/TabBarShape';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? 'light'];

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="home"
        screenOptions={{
          tabBarActiveTintColor: c.tabBarIconActive,
          tabBarInactiveTintColor: c.tabBarIconInactive,
          headerShown: true,
          headerStyle: { backgroundColor: c.background },
          headerTitleStyle: { fontWeight: '600', fontSize: 18 },
          headerTintColor: c.text,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Главная',
            headerShown: false,
            tabBarIcon: ({ focused, size }) => (
              <View style={focused ? tabStyles.iconCircle : undefined}>
                <Ionicons
                  name="home"
                  size={size}
                  color={focused ? c.tabBarIconActive : c.tabBarIconInactive}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Проекты',
            headerShown: false,
            tabBarIcon: ({ focused, size }) => (
              <View style={focused ? tabStyles.iconCircle : undefined}>
                <Ionicons
                  name="folder-outline"
                  size={size}
                  color={focused ? c.tabBarIconActive : c.tabBarIconInactive}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="visualize"
          options={{
            title: 'Визуализация',
            tabBarIcon: ({ focused, size }) => (
              <View style={focused ? tabStyles.iconCircle : undefined}>
                <Ionicons
                  name="camera-outline"
                  size={size}
                  color={focused ? c.tabBarIconActive : c.tabBarIconInactive}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="catalog"
          options={{
            title: 'Каталог',
            tabBarIcon: ({ focused, size }) => (
              <View style={focused ? tabStyles.iconCircle : undefined}>
                <Ionicons
                  name="grid-outline"
                  size={size}
                  color={focused ? c.tabBarIconActive : c.tabBarIconInactive}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'Профиль',
            headerShown: false,
            tabBarIcon: ({ focused, size }) => (
              <View style={focused ? tabStyles.iconCircle : undefined}>
                <Ionicons
                  name="person-outline"
                  size={size}
                  color={focused ? c.tabBarIconActive : c.tabBarIconInactive}
                />
              </View>
            ),
          }}
        />
      </Tabs>
      {/* Обёртка на весь экран — форма позиционируется от реального низа, иначе bottom не срабатывает */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <TabBarShape />
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#69C5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
