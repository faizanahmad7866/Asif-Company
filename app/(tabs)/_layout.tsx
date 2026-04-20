import { Tabs } from 'expo-router';
import { Home, List, PlusSquare, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useAppThemeAndText } from '../../hooks/useAppThemeAndText';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { Theme, text } = useAppThemeAndText();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: Theme.colors.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: Theme.colors.border,
          height: Platform.OS === 'ios' ? 88 : 64 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? 28 : insets.bottom + 8,
          paddingTop: 10,
          ...Theme.shadow.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarItemStyle: {
          borderRadius: Theme.borderRadius.m,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: text.tabHome,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="shops"
        options={{
          title: text.tabShops,
          tabBarIcon: ({ color, size }) => <List size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: text.tabAdd,
          tabBarIcon: ({ color, size }) => <PlusSquare size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: text.tabSettings,
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
  );
}
