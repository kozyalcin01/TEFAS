import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>{label}</Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Portföy',
          tabBarIcon: ({ focused }) => <TabIcon label="◉" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="islemler"
        options={{
          title: 'İşlemler',
          tabBarIcon: ({ focused }) => <TabIcon label="⇄" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="performans"
        options={{
          title: 'Performans',
          tabBarIcon: ({ focused }) => <TabIcon label="↗" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="varliklar"
        options={{
          title: 'Varlıklar',
          tabBarIcon: ({ focused }) => <TabIcon label="◎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="senaryo"
        options={{
          title: 'Senaryo',
          tabBarIcon: ({ focused }) => <TabIcon label="⚡" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg.secondary,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
  },
  label: { fontSize: 10, fontWeight: '600' },
  icon: { fontSize: 18, color: colors.text.tertiary },
  iconFocused: { color: colors.accent },
});
