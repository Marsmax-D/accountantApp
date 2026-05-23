import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, RefreshControl, SectionList, Pressable, View, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createTransactionRepo } from '@/db/transaction-repo';
import { createReportQueries } from '@/db/report-queries';
import { formatCurrency, formatRelativeDate } from '@/utils/format';
import { useUIStore } from '@/store/use-ui-store';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/common/EmptyState';
import { FloatingActionButton } from '@/components/common/FloatingActionButton';
import { FilterBar } from '@/components/transactions/FilterBar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { type TransactionWithCategory } from '@/types/transaction';

interface Section {
  title: string;
  data: TransactionWithCategory[];
}

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [sections, setSections] = useState<Section[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<TransactionWithCategory | null>(null);

  const { filterDateFrom, filterDateTo, searchQuery } = useUIStore();

  const loadData = useCallback(async () => {
    try {
      const txRepo = createTransactionRepo(db);
      const reportQueries = createReportQueries(db);

      const [transactions, incomeTotal] = await Promise.all([
        txRepo.getAll({
          dateFrom: filterDateFrom ?? undefined,
          dateTo: filterDateTo ?? undefined,
          searchQuery: searchQuery || undefined,
          limit: 200,
        }),
        reportQueries.totalIncome(
          filterDateFrom ?? '2000-01-01',
          filterDateTo ?? '2099-12-31',
        ),
      ]);

      setTotalAmount(incomeTotal.total);
      setTotalCount(incomeTotal.count);

      if (transactions.length === 0) {
        setSections([]);
        setHasData(false);
        return;
      }

      setHasData(true);

      const grouped: Record<string, TransactionWithCategory[]> = {};
      for (const tx of transactions) {
        if (!grouped[tx.date]) grouped[tx.date] = [];
        grouped[tx.date].push(tx);
      }

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

      const sectionList: Section[] = Object.entries(grouped).map(([date, items]) => {
        let title: string;
        if (date === todayStr) title = '今天';
        else if (date === yesterdayStr) title = '昨天';
        else title = formatRelativeDate(date);
        return { title, data: items };
      });

      sectionList.sort((a, b) => b.data[0].date.localeCompare(a.data[0].date));
      setSections(sectionList);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  }, [db, filterDateFrom, filterDateTo, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Re-fetch when filter params change
  useEffect(() => {
    loadData();
  }, [filterDateFrom, filterDateTo, searchQuery]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const txRepo = createTransactionRepo(db);
      await txRepo.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch {
      Alert.alert('删除失败', '请稍后重试');
      setDeleteTarget(null);
    }
  }, [db, deleteTarget, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText style={styles.pageTitle}>账单</ThemedText>
        <FilterBar />

        <ThemedView style={styles.totalRow}>
          <ThemedText style={styles.totalAmount}>{formatCurrency(totalAmount)}</ThemedText>
          <ThemedText style={styles.totalCount}>共 {totalCount} 笔</ThemedText>
        </ThemedView>

        {!hasData ? (
          <EmptyState
            icon="📄"
            title={searchQuery ? '没有匹配的记录' : '暂无账单记录'}
            description={searchQuery ? '尝试修改搜索条件' : '添加收入后，账单会在这里按日期排列。'}
          />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderSectionHeader={({ section }) => (
              <ThemedView style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
              </ThemedView>
            )}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
                onPress={() => router.push(`/add-transaction?id=${item.id}`)}
                onLongPress={() => setDeleteTarget(item)}
              >
                <View style={[styles.dot, { backgroundColor: item.category_color ?? '#999' }]} />
                <View style={styles.info}>
                  <View style={styles.categoryRow}>
                    <ThemedText style={styles.category}>{item.category_name}</ThemedText>
                    {item.source === 'wechat' && (
                      <View style={styles.sourceBadge}>
                        <ThemedText style={styles.sourceText}>微信</ThemedText>
                      </View>
                    )}
                  </View>
                  {item.note && (
                    <ThemedText style={styles.note} numberOfLines={1}>{item.note}</ThemedText>
                  )}
                </View>
                <ThemedText style={styles.amount}>{formatCurrency(item.amount)}</ThemedText>
              </Pressable>
            )}
            stickySectionHeadersEnabled
          />
        )}

        <FloatingActionButton onPress={() => router.push('/add-transaction')} />

        <ConfirmDialog
          visible={deleteTarget !== null}
          title="删除记录"
          message={`确定要删除这笔 ${formatCurrency(deleteTarget?.amount ?? 0)} 的收入记录吗？`}
          confirmText="删除"
          cancelText="取消"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          destructive
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
  },
  totalCount: {
    fontSize: 13,
    opacity: 0.5,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  info: { flex: 1 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  category: { fontSize: 15, fontWeight: '500' },
  sourceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '500',
  },
  note: { fontSize: 12, opacity: 0.5, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '600' },
});
