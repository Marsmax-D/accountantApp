import { useColorScheme } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.text },
      }}
      iconColor={{
        default: colors.textSecondary,
        selected: colors.text,
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/home.png')} />
        <NativeTabs.Trigger.Label>首页</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/transactions.png')} />
        <NativeTabs.Trigger.Label>账单</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="reports">
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/reports.png')} />
        <NativeTabs.Trigger.Label>报表</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/settings.png')} />
        <NativeTabs.Trigger.Label>设置</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
