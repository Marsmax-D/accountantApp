import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFamilyStore } from '@/store/use-family-store';
import { createTransactionRepo } from '@/db/transaction-repo';
import { createReportQueries } from '@/db/report-queries';
import { toDateString, formatCurrency } from '@/utils/format';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { FloatingActionButton } from '@/components/common/FloatingActionButton';
import { type ReportSummary } from '@/types/report';
import { type TransactionWithCategory } from '@/types/transaction';

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  // Today's data for the net total card
  const [incomeTotal, setIncomeTotal] = useState<ReportSummary>({ total: 0, count: 0 });
  const [expenseTotal, setExpenseTotal] = useState<ReportSummary>({ total: 0, count: 0 });
  // Monthly data for the breakdown section (so past-date transactions show up)
  const [monthIncome, setMonthIncome] = useState<ReportSummary>({ total: 0, count: 0 });
  const [monthExpense, setMonthExpense] = useState<ReportSummary>({ total: 0, count: 0 });
  const [recent, setRecent] = useState<TransactionWithCategory[]>([]);
  const [hasData, setHasData] = useState(false);

  const now = new Date();
  const todayStr = toDateString(now);
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const periodLabel = `${now.getMonth() + 1}月${now.getDate()}日`;

  const loadData = useCallback(async () => {
    try {
      const txRepo = createTransactionRepo(db);
      const reportQueries = createReportQueries(db);

      const [incomeTotalData, expenseTotalData, monthIncomeData, monthExpenseData, recentData] = await Promise.all([
        reportQueries.totalIncome(todayStr, todayStr),
        reportQueries.totalExpense(todayStr, todayStr),
        reportQueries.totalIncome(monthStart, todayStr),
        reportQueries.totalExpense(monthStart, todayStr),
        txRepo.getRecent(6),
      ]);

      setIncomeTotal(incomeTotalData);
      setExpenseTotal(expenseTotalData);
      setMonthIncome(monthIncomeData);
      setMonthExpense(monthExpenseData);
      setRecent(recentData);
      setHasData(recentData.length > 0 || incomeTotalData.count > 0 || expenseTotalData.count > 0);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, [db]);

  // 监听同步完成事件，云端数据拉取后自动刷新首页
  const syncVersion = useFamilyStore((s) => s.syncVersion);
  useEffect(() => {
    loadData();
  }, [syncVersion, loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Determine which totals to show in the breakdown
  const breakdownIncome = monthIncome.count > 0 ? monthIncome : incomeTotal;
  const breakdownExpense = monthExpense.count > 0 ? monthExpense : expenseTotal;
  const hasBreakdown = breakdownIncome.count > 0 || breakdownExpense.count > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={{ flex: 1 }}>
          {!hasData ? (
            <DashboardEmptyState />
          ) : (
            <View style={{ flex: 1 }}>
              {(() => {
                const netTotal = incomeTotal.total - expenseTotal.total;
                const netCount = incomeTotal.count + expenseTotal.count;
                const isPositive = netTotal >= 0;
                return (
                  <ThemedView style={[cardStyles.netTotalCard, { backgroundColor: isPositive ? '#E8F5E9' : '#FFEBEE' }]}>
                    <ThemedText style={cardStyles.netTotalLabel}>{periodLabel}收支</ThemedText>
                    <ThemedText style={[cardStyles.netTotalAmount, { color: isPositive ? '#2E7D32' : '#C62828' }]}>
                      {formatCurrency(netTotal)}
                    </ThemedText>
                    <ThemedText style={cardStyles.netTotalCount}>共 {netCount} 笔</ThemedText>
                  </ThemedView>
                );
              })()}

              {hasBreakdown && (
                <ThemedView style={cardStyles.breakdownSection}>
                  <ThemedText style={cardStyles.sectionTitle}>本月收支</ThemedText>
                  <View style={cardStyles.breakdownRow}>
                    {breakdownIncome.count > 0 && (
                      <View style={[cardStyles.breakdownBox, { backgroundColor: '#f0fdf4' }]}>
                        <View style={cardStyles.breakdownInner}>
                          <View style={cardStyles.breakdownHeader}>
                            <View style={[cardStyles.breakdownIcon, { backgroundColor: '#4CAF50' }]}>
                              <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>收</ThemedText>
                            </View>
                            <ThemedText style={cardStyles.breakdownLabel}>收入</ThemedText>
                            <ThemedText style={[cardStyles.breakdownPct, { color: '#2E7D32' }]}>
                              {breakdownExpense.count > 0
                                ? ((breakdownIncome.total / (breakdownIncome.total + breakdownExpense.total)) * 100).toFixed(0)
                                : '100'}%
                            </ThemedText>
                          </View>
                          <ThemedText style={[cardStyles.breakdownAmount, { color: '#2E7D32' }]}>
                            {formatCurrency(breakdownIncome.total)}
                          </ThemedText>
                          <ThemedText style={cardStyles.breakdownCount}>共 {breakdownIncome.count} 笔</ThemedText>
                        </View>
                      </View>
                    )}
                    {breakdownExpense.count > 0 && (
                      <View style={[cardStyles.breakdownBox, { backgroundColor: '#fef2f2' }]}>
                        <View style={cardStyles.breakdownInner}>
                          <View style={cardStyles.breakdownHeader}>
                            <View style={[cardStyles.breakdownIcon, { backgroundColor: '#F44336' }]}>
                              <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>支</ThemedText>
                            </View>
                            <ThemedText style={cardStyles.breakdownLabel}>支出</ThemedText>
                            <ThemedText style={[cardStyles.breakdownPct, { color: '#C62828' }]}>
                              {breakdownIncome.count > 0
                                ? ((breakdownExpense.total / (breakdownIncome.total + breakdownExpense.total)) * 100).toFixed(0)
                                : '100'}%
                            </ThemedText>
                          </View>
                          <ThemedText style={[cardStyles.breakdownAmount, { color: '#C62828' }]}>
                            {formatCurrency(breakdownExpense.total)}
                          </ThemedText>
                          <ThemedText style={cardStyles.breakdownCount}>共 {breakdownExpense.count} 笔</ThemedText>
                        </View>
                      </View>
                    )}
                  </View>
                </ThemedView>
              )}

              <View style={{ marginTop: -15 }}>
                <RecentTransactions
                  transactions={recent}
                  onViewAll={() => router.push('/transactions')}
                />
              </View>
            </View>
          )}
        </View>

        <FloatingActionButton onPress={() => router.push('/add-transaction')} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});

const cardStyles = StyleSheet.create({
  netTotalCard: {
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 24,
    borderRadius: 20,
  },
  netTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.5,
    marginBottom: 4,
  },
  netTotalAmount: {
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 52,
    marginBottom: 8,
  },
  netTotalCount: {
    fontSize: 13,
    opacity: 0.4,
  },
  // Breakdown section — background edges align with netTotalCard
  breakdownSection: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 16,
    overflow: 'hidden',
    paddingTop: 20,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  breakdownBox: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  breakdownInner: {
    padding: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  breakdownPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownAmount: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  breakdownCount: {
    fontSize: 12,
    opacity: 0.5,
  },
});
