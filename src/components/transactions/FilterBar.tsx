import { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUIStore } from '@/store/use-ui-store';

const PRESETS = [
  { label: '本月', days: 'month' },
  { label: '上月', days: 'lastMonth' },
  { label: '今年', days: 'year' },
  { label: '全部', days: 'all' },
] as const;

export function FilterBar() {
  const theme = useTheme();
  const {
    filterDateFrom, filterDateTo,
    setFilterDateRange, searchQuery, setSearchQuery, resetFilters,
  } = useUIStore();

  const [activePreset, setActivePreset] = useState<string>('month');

  const handlePreset = (preset: string) => {
    setActivePreset(preset);
    const now = new Date();

    switch (preset) {
      case 'month': {
        const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        setFilterDateRange(start, end);
        break;
      }
      case 'lastMonth': {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        setFilterDateRange(
          `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`,
          `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
        );
        break;
      }
      case 'year': {
        setFilterDateRange(`${now.getFullYear()}-01-01`, `${now.getFullYear()}-12-31`);
        break;
      }
      case 'all':
        setFilterDateRange(null, null);
        break;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { color: theme.text, borderColor: theme.backgroundElement }]}
          placeholder="搜索备注或分类"
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <ThemedText style={styles.clearText}>✕</ThemedText>
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presets}>
        {PRESETS.map((p) => (
          <Pressable
            key={p.label}
            style={({ pressed }) => [
              styles.presetChip,
              { backgroundColor: activePreset === p.days ? theme.text : theme.backgroundElement },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => handlePreset(p.days)}
          >
            <ThemedText
              style={[
                styles.presetLabel,
                { color: activePreset === p.days ? theme.background : theme.text },
              ]}
            >
              {p.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchRow: {
    position: 'relative',
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 14,
    opacity: 0.5,
  },
  presets: {
    flexDirection: 'row',
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
