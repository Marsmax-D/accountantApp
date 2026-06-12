import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency } from '@/utils/format';
import { type SourceBreakdown as SourceBreakdownType } from '@/types/report';

interface Props {
  data: SourceBreakdownType[];
  total: number;
}

const SOURCE_LABELS: Record<string, string> = {
  wechat: '微信收入',
  manual: '线下收入',
};

const SOURCE_COLORS: Record<string, string> = {
  wechat: '#07C160',
  manual: '#FF9800',
};

export function SourceBreakdown({ data, total }: Props) {
  if (data.length === 0) return null;

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.title}>收入来源</ThemedText>
      {data.map((item) => {
        const pct = total > 0 ? (item.total / total) * 100 : 0;
        return (
          <View key={item.source} style={styles.row}>
            <View style={styles.header}>
              <View style={[styles.dot, { backgroundColor: SOURCE_COLORS[item.source] ?? '#999' }]} />
              <ThemedText style={styles.label}>{SOURCE_LABELS[item.source] ?? item.source}</ThemedText>
              <ThemedText style={styles.pct}>{pct.toFixed(0)}%</ThemedText>
            </View>
            <ThemedText style={styles.amount}>{formatCurrency(item.total)}</ThemedText>
            <View style={styles.barBg}>
              <View style={[styles.bar, { width: `${pct}%`, backgroundColor: SOURCE_COLORS[item.source] ?? '#999' }]} />
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
    fontSize: 13,
    opacity: 0.5,
    marginRight: 8,
  },
  amount: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    marginBottom: 6,
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
