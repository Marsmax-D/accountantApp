import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency, formatPercent } from '@/utils/format';

interface Props {
  total: number;
  count: number;
  previousTotal: number;
  periodLabel: string;
  comparisonLabel?: string;
}

export function IncomeTotalCard({ total, count, previousTotal, periodLabel, comparisonLabel = '较上月' }: Props) {
  const theme = useTheme();
  const change = previousTotal > 0 ? (total - previousTotal) / previousTotal : 0;
  const isUp = change >= 0;

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.label}>{periodLabel}收入</ThemedText>
      <ThemedText style={styles.amount}>{formatCurrency(total)}</ThemedText>
      <View style={styles.row}>
        <View style={[styles.changeBadge, { backgroundColor: isUp ? '#E8F5E9' : '#FFEBEE' }]}>
          <ThemedText style={[styles.changeText, { color: isUp ? '#2E7D32' : '#C62828' }]}>
            {formatPercent(change)} {comparisonLabel}
          </ThemedText>
        </View>
        <ThemedText style={styles.count}>共 {count} 笔</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  label: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 4,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 46,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  count: {
    fontSize: 13,
    opacity: 0.5,
  },
});
