import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency } from '@/utils/format';
import { type CategoryBreakdown as CategoryBreakdownType } from '@/types/report';

interface Props {
  data: CategoryBreakdownType[];
  total: number;
}

export function CategoryBreakdown({ data, total }: Props) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.total), 1);

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.title}>分类分析</ThemedText>
      {data.map((item, i) => {
        const pct = total > 0 ? (item.total / total) * 100 : 0;
        const widthPct = (item.total / maxValue) * 100;
        return (
          <View key={i} style={styles.row}>
            <View style={styles.header}>
              <View style={[styles.dot, { backgroundColor: item.color ?? '#999' }]} />
              <ThemedText style={styles.label} numberOfLines={1}>{item.name}</ThemedText>
              <ThemedText style={styles.pct}>{pct.toFixed(0)}%</ThemedText>
              <ThemedText style={styles.amount}>{formatCurrency(item.total)}</ThemedText>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.bar, { width: `${widthPct}%`, backgroundColor: item.color ?? '#999' }]} />
            </View>
          </View>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  row: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    flex: 1,
  },
  pct: {
    fontSize: 12,
    opacity: 0.5,
    marginRight: 8,
    width: 36,
    textAlign: 'right',
  },
  amount: {
    fontSize: 13,
    fontWeight: '500',
    width: 80,
    textAlign: 'right',
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
});
