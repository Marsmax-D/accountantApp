import { useRef, useEffect } from 'react';
import { Image, Animated, Pressable, useColorScheme, type ImageSourcePropType } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';

import { Colors } from '@/constants/theme';

function TabBarButton(props: any) {
  return (
    <Pressable
      {...props}
      android_ripple={null}
    />
  );
}

function TabIcon({ source, focused }: { source: ImageSourcePropType; focused: boolean }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const toY = focused ? -8 : 0;
    const toScale = focused ? 1.15 : 1;
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: toY,
        tension: 80,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: toScale,
        tension: 80,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, translateY, scale]);

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
      <Image source={source} style={{ width: 24, height: 24 }} resizeMode="contain" />
    </Animated.View>
  );
}

const HOME_ICON = require('@/assets/images/tabIcons/home_1.png');
const TRANSACTIONS_ICON = require('@/assets/images/tabIcons/transactions.png');
const REPORTS_ICON = require('@/assets/images/tabIcons/reports.png');
const FAMILY_ICON = require('@/assets/images/tabIcons/family.png');
const SETTINGS_ICON = require('@/assets/images/tabIcons/settings.png');

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ focused }) => <TabIcon source={HOME_ICON} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: '账单',
          tabBarIcon: ({ focused }) => <TabIcon source={TRANSACTIONS_ICON} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: '报表',
          tabBarIcon: ({ focused }) => <TabIcon source={REPORTS_ICON} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: '家庭',
          tabBarIcon: ({ focused }) => <TabIcon source={FAMILY_ICON} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ focused }) => <TabIcon source={SETTINGS_ICON} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
