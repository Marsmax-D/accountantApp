import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency, formatPercent } from '@/utils/format';

interface Props {
  total: number;
  count: number;
  previousTotal: number;
  dailyAvg: number;
}

export function ReportSummaryCard({ total, count, previousTotal, dailyAvg }: Props) {
  const change = previousTotal > 0 ? (total - previousTotal) / previousTotal : 0;
  const isUp = change >= 0;

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.label}>总收入</ThemedText>
      <ThemedText style={styles.amount}>{formatCurrency(total)}</ThemedText>

      <View style={styles.metaRow}>
        <View style={[styles.changeBadge, { backgroundColor: isUp ? '#E8F5E9' : '#FFEBEE' }]}>
          <ThemedText style={[styles.changeText, { color: isUp ? '#2E7D32' : '#C62828' }]}>
            {formatPercent(change)}
          </ThemedText>
        </View>
        <ThemedText style={styles.meta}>较上期</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <ThemedText style={styles.statValue}>{count}</ThemedText>
          <ThemedText style={styles.statLabel}>交易笔数</ThemedText>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <ThemedText style={styles.statValue}>{formatCurrency(dailyAvg)}</ThemedText>
          <ThemedText style={styles.statLabel}>日均收入</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
  },
  label: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 4,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 42,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    opacity: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    paddingTop: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
});
