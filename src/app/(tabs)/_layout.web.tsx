import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const TABS = [
  { name: 'index', label: '首页', icon: '🏠' },
  { name: 'transactions', label: '账单', icon: '📋' },
  { name: 'reports', label: '报表', icon: '📊' },
  { name: 'family', label: '家庭', icon: '👨‍👩‍👧' },
  { name: 'settings', label: '设置', icon: '⚙️' },
] as const;

export default function TabLayout() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <ThemedView type="backgroundElement" style={styles.tabListContainer}>
          <ThemedView type="backgroundElement" style={styles.innerContainer}>
            {TABS.map((tab) => (
              <TabTrigger key={tab.name} name={tab.name} asChild>
                <TabButton icon={tab.icon}>{tab.label}</TabButton>
              </TabTrigger>
            ))}
          </ThemedView>
        </ThemedView>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon?: string }) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}
      >
        <ThemedText style={styles.tabIcon}>{icon}</ThemedText>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    bottom: 0,
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: 2,
  },
  tabIcon: {
    fontSize: 16,
  },
});
