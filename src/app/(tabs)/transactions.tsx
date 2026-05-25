import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, RefreshControl, SectionList, Pressable, View, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFamilyStore } from '@/store/use-family-store';
import { createTransactionRepo } from '@/db/transaction-repo';
import { createReportQueries } from '@/db/report-queries';
import { formatCurrency, formatRelativeDate, toDateString } from '@/utils/format';
import { useUIStore } from '@/store/use-ui-store';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/common/EmptyState';
import { FloatingActionButton } from '@/components/common/FloatingActionButton';
import { FilterBar } from '@/components/transactions/FilterBar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { type TransactionWithCategory } from '@/types/transaction';

interface Section {
  title: string;
  date: string;
  data: TransactionWithCategory[];
  dayTotal: number;
}

const PAGE_SIZE = 30;

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [sections, setSections] = useState<Section[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<TransactionWithCategory | null>(null);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);

  const limitRef = useRef(PAGE_SIZE);

  const { filterDateFrom, filterDateTo, filterType, searchQuery, setFilterType } = useUIStore();

  const loadData = useCallback(async (append = false) => {
    try {
      const txRepo = createTransactionRepo(db);
      const reportQueries = createReportQueries(db);

      const typeFilter = filterType !== 'all' ? filterType : undefined;

      if (!append) {
        limitRef.current = PAGE_SIZE;
      }

      const [transactions, incomeTotalData, expenseTotalData] = await Promise.all([
        txRepo.getAll({
          dateFrom: filterDateFrom ?? undefined,
          dateTo: filterDateTo ?? undefined,
          searchQuery: searchQuery || undefined,
          type: typeFilter,
          limit: limitRef.current,
        }),
        reportQueries.totalIncome(
          filterDateFrom ?? '2000-01-01',
          filterDateTo ?? '2099-12-31',
        ),
        reportQueries.totalExpense(
          filterDateFrom ?? '2000-01-01',
          filterDateTo ?? '2099-12-31',
        ),
      ]);

      setIncomeTotal(incomeTotalData.total);
      setExpenseTotal(expenseTotalData.total);
      setHasMore(transactions.length >= limitRef.current);

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
      const todayStr = toDateString(now);
      const yesterdayStr = toDateString(new Date(now.getTime() - 86400000));

      const sectionList: Section[] = Object.entries(grouped).map(([date, items]) => {
        let title: string;
        if (date === todayStr) title = '今天';
        else if (date === yesterdayStr) title = '昨天';
        else title = formatRelativeDate(date);
        const dayTotal = items.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
        return { title, date, data: items, dayTotal };
      });

      sectionList.sort((a, b) => b.date.localeCompare(a.date));
      setSections(sectionList);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  }, [db, filterDateFrom, filterDateTo, filterType, searchQuery]);

  // 监听同步完成事件，云端数据拉取后自动刷新账单列表
  const syncVersion = useFamilyStore((s) => s.syncVersion);
  useEffect(() => {
    loadData();
  }, [syncVersion, loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Re-fetch when filter params change
  useEffect(() => {
    loadData();
  }, [filterDateFrom, filterDateTo, filterType, searchQuery]);

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

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    limitRef.current += PAGE_SIZE;
    loadData(true);
  }, [hasMore, loadData]);

  const toggleSection = (date: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const visibleSections = useMemo(() =>
    sections.map(s => ({
      ...s,
      data: collapsedDates.has(s.date) ? [] : s.data,
    })),
    [sections, collapsedDates]
  );

  const hasIncome = incomeTotal > 0;
  const hasExpense = expenseTotal > 0;

  const renderBreakdown = () => {
    if (filterType === 'all') {
      if (!hasIncome && !hasExpense) return null;
      return (
        <View style={styles.breakdownRow}>
          {hasIncome && (
            <View style={[styles.breakdownBox, { backgroundColor: '#f0fdf4' }]}>
              <ThemedText style={styles.breakdownLabel}>收入</ThemedText>
              <ThemedText style={[styles.breakdownAmount, { color: '#2E7D32' }]}>
                {formatCurrency(incomeTotal)}
              </ThemedText>
            </View>
          )}
          {hasExpense && (
            <View style={[styles.breakdownBox, { backgroundColor: '#fef2f2' }]}>
              <ThemedText style={styles.breakdownLabel}>支出</ThemedText>
              <ThemedText style={[styles.breakdownAmount, { color: '#C62828' }]}>
                {formatCurrency(expenseTotal)}
              </ThemedText>
            </View>
          )}
        </View>
      );
    }
    if (filterType === 'income' && hasIncome) {
      return (
        <View style={styles.breakdownRow}>
          <View style={[styles.breakdownBox, { backgroundColor: '#f0fdf4' }]}>
            <ThemedText style={styles.breakdownLabel}>收入</ThemedText>
            <ThemedText style={[styles.breakdownAmount, { color: '#2E7D32' }]}>
              {formatCurrency(incomeTotal)}
            </ThemedText>
          </View>
        </View>
      );
    }
    if (filterType === 'expense' && hasExpense) {
      return (
        <View style={styles.breakdownRow}>
          <View style={[styles.breakdownBox, { backgroundColor: '#fef2f2' }]}>
            <ThemedText style={styles.breakdownLabel}>支出</ThemedText>
            <ThemedText style={[styles.breakdownAmount, { color: '#C62828' }]}>
              {formatCurrency(expenseTotal)}
            </ThemedText>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText style={styles.pageTitle}>账单</ThemedText>
        <View style={styles.filterTypeRow}>
          <SegmentedControl
            options={[
              { key: 'all', label: '收支' },
              { key: 'income', label: '收入' },
              { key: 'expense', label: '支出' },
            ]}
            selected={filterType}
            onSelect={(key) => setFilterType(key as 'all' | 'income' | 'expense')}
          />
        </View>
        <FilterBar />

        {renderBreakdown()}

        {!hasData ? (
          <EmptyState
            icon="📄"
            title={searchQuery ? '没有匹配的记录' : '暂无账单记录'}
            description={searchQuery ? '尝试修改搜索条件' : '添加收入或支出后，账单会在这里按日期排列。'}
          />
        ) : (
          <SectionList
            sections={visibleSections}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            contentContainerStyle={{ paddingBottom: 80 }}
            renderSectionHeader={({ section }) => {
              const orig = sections.find(s => s.date === section.date)!;
              const isCollapsed = collapsedDates.has(section.date);
              return (
                <Pressable onPress={() => toggleSection(section.date)}>
                  <ThemedView style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLeft}>
                      <ThemedText style={styles.sectionArrow}>{isCollapsed ? '▶' : '▼'}</ThemedText>
                      <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
                      <ThemedText style={styles.sectionCount}>{orig.data.length}笔</ThemedText>
                    </View>
                    <ThemedText style={[styles.sectionTotal, { color: orig.dayTotal >= 0 ? '#2E7D32' : '#C62828' }]}>{formatCurrency(orig.dayTotal)}</ThemedText>
                  </ThemedView>
                </Pressable>
              );
            }}
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
          message={`确定要删除这笔 ${formatCurrency(deleteTarget?.amount ?? 0)} 的记录吗？`}
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
  filterTypeRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  breakdownBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.6,
  },
  breakdownAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionArrow: {
    fontSize: 10,
    opacity: 0.35,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
  },
  sectionCount: {
    fontSize: 12,
    opacity: 0.35,
  },
  sectionTotal: {
    fontSize: 15,
    fontWeight: '700',
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
