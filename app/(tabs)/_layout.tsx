import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, MIN_TAP } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundElevated,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 82,
          paddingBottom: 12,
          paddingTop: 10,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'DMSans_500Medium',
          fontSize: 14,
          marginTop: 2,
        },
        tabBarItemStyle: {
          minHeight: MIN_TAP,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="oracoes"
        options={{
          title: 'Orações',
          tabBarIcon: ({ color }) => (
            <Ionicons name="book-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ferramentas"
        options={{
          title: 'Ferramentas',
          tabBarIcon: ({ color }) => (
            <Ionicons name="sparkles-outline" size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
