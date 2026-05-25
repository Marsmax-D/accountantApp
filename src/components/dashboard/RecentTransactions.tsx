import { StyleSheet, Pressable, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency, formatRelativeDate } from '@/utils/format';
import { type TransactionWithCategory } from '@/types/transaction';

interface Props {
  transactions: TransactionWithCategory[];
  onViewAll?: () => void;
  onItemPress?: (tx: TransactionWithCategory) => void;
}

export function RecentTransactions({ transactions, onViewAll, onItemPress }: Props) {
  if (transactions.length === 0) return null;

  return (
    <ThemedView style={styles.card}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>最近记录</ThemedText>
        {onViewAll && (
          <Pressable onPress={onViewAll}>
            <ThemedText style={styles.viewAll}>查看全部</ThemedText>
          </Pressable>
        )}
      </View>
      {transactions.map((tx) => (
        <Pressable
          key={tx.id}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          onPress={() => onItemPress?.(tx)}
        >
          <View style={[styles.dot, { backgroundColor: tx.category_color ?? '#999' }]} />
          <View style={styles.info}>
            <ThemedText style={styles.category}>{tx.category_name}</ThemedText>
            <ThemedText style={styles.note} numberOfLines={1}>
              {tx.note || formatRelativeDate(tx.date)}
            </ThemedText>
          </View>
          <View style={styles.right}>
            <ThemedText style={styles.amount}>{formatCurrency(tx.amount)}</ThemedText>
            <ThemedText style={styles.date}>{formatRelativeDate(tx.date)}</ThemedText>
          </View>
        </Pressable>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 2,
    padding: 14,
    paddingTop: 12,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  viewAll: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f0',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  category: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  note: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  date: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
});
