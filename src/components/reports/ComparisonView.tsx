import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency, formatPercent } from '@/utils/format';
import { type ComparisonData } from '@/types/report';

interface Props {
  data: ComparisonData;
  currentLabel: string;
  previousLabel: string;
}

export function ComparisonView({ data, currentLabel, previousLabel }: Props) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.title}>对比分析</ThemedText>

      <View style={styles.headerRow}>
        <View style={[styles.periodBox, styles.currentBox]}>
          <ThemedText style={styles.periodLabel}>{currentLabel}</ThemedText>
          <ThemedText style={styles.periodAmount}>{formatCurrency(data.current.total)}</ThemedText>
          <ThemedText style={styles.periodCount}>{data.current.count} 笔</ThemedText>
        </View>
        <View style={styles.vsColumn}>
          <ThemedText style={styles.vsText}>VS</ThemedText>
          <ThemedText style={[styles.changeText, { color: data.change >= 0 ? '#2E7D32' : '#C62828' }]}>
            {formatPercent(data.change)}
          </ThemedText>
        </View>
        <View style={[styles.periodBox, styles.previousBox]}>
          <ThemedText style={styles.periodLabel}>{previousLabel}</ThemedText>
          <ThemedText style={styles.periodAmount}>{formatCurrency(data.previous.total)}</ThemedText>
          <ThemedText style={styles.periodCount}>{data.previous.count} 笔</ThemedText>
        </View>
      </View>

      {data.currentByCategory.length > 0 && (
        <>
          <ThemedText style={styles.subtitle}>分类对比</ThemedText>
          {data.currentByCategory.map((cat, i) => {
            const prev = data.previousByCategory.find(p => p.name === cat.name);
            const prevTotal = prev?.total ?? 0;
            const catChange = prevTotal > 0 ? (cat.total - prevTotal) / prevTotal : 1;

            return (
              <View key={i} style={styles.catRow}>
                <View style={styles.catInfo}>
                  <View style={[styles.catDot, { backgroundColor: cat.color ?? '#999' }]} />
                  <ThemedText style={styles.catName}>{cat.name}</ThemedText>
                </View>
                <View style={styles.catValues}>
                  <ThemedText style={styles.catValue}>{formatCurrency(cat.total)}</ThemedText>
                  <ThemedText style={[styles.catChange, { color: catChange >= 0 ? '#2E7D32' : '#C62828' }]}>
                    {formatPercent(catChange)}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </>
      )}
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
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  periodBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  currentBox: {
    backgroundColor: '#E8F5E9',
  },
  previousBox: {
    backgroundColor: '#F5F5F5',
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.6,
  },
  periodAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  periodCount: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
  vsColumn: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  vsText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.4,
    marginBottom: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  catInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catName: {
    fontSize: 14,
  },
  catValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  catChange: {
    fontSize: 12,
    fontWeight: '600',
    width: 56,
    textAlign: 'right',
  },
});
