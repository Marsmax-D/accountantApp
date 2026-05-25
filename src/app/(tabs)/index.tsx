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

  const [incomeTotal, setIncomeTotal] = useState<ReportSummary>({ total: 0, count: 0 });
  const [expenseTotal, setExpenseTotal] = useState<ReportSummary>({ total: 0, count: 0 });
  const [recent, setRecent] = useState<TransactionWithCategory[]>([]);
  const [hasData, setHasData] = useState(false);

  const now = new Date();
  const todayStr = toDateString(now);
  const periodLabel = `${now.getMonth() + 1}月${now.getDate()}日`;

  const loadData = useCallback(async () => {
    try {
      const txRepo = createTransactionRepo(db);
      const reportQueries = createReportQueries(db);

      const [incomeTotalData, expenseTotalData, recentData] = await Promise.all([
        reportQueries.totalIncome(todayStr, todayStr),
        reportQueries.totalExpense(todayStr, todayStr),
        txRepo.getRecent(6),
      ]);

      setIncomeTotal(incomeTotalData);
      setExpenseTotal(expenseTotalData);
      setRecent(recentData);
      setHasData(incomeTotalData.count > 0 || expenseTotalData.count > 0 || recentData.length > 0);
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

              {incomeTotal.count + expenseTotal.count > 0 && (
                <ThemedView style={cardStyles.card}>
                  <ThemedText style={cardStyles.title}>收支明细</ThemedText>
                  <View style={cardStyles.breakdownRow}>
                    {incomeTotal.count > 0 && (
                      <View style={[cardStyles.breakdownBox, { backgroundColor: '#f0fdf4' }]}>
                        <View style={cardStyles.breakdownHeader}>
                          <ThemedText style={cardStyles.breakdownIcon}>📥</ThemedText>
                          <ThemedText style={cardStyles.breakdownLabel}>收入</ThemedText>
                          <ThemedText style={[cardStyles.breakdownPct, { color: '#2E7D32' }]}>
                            {((incomeTotal.total / (incomeTotal.total + expenseTotal.total)) * 100).toFixed(0)}%
                          </ThemedText>
                        </View>
                        <ThemedText style={[cardStyles.breakdownAmount, { color: '#2E7D32' }]}>
                          {formatCurrency(incomeTotal.total)}
                        </ThemedText>
                        <ThemedText style={cardStyles.breakdownCount}>共 {incomeTotal.count} 笔</ThemedText>
                      </View>
                    )}
                    {expenseTotal.count > 0 && (
                      <View style={[cardStyles.breakdownBox, { backgroundColor: '#fef2f2' }]}>
                        <View style={cardStyles.breakdownHeader}>
                          <ThemedText style={cardStyles.breakdownIcon}>📤</ThemedText>
                          <ThemedText style={cardStyles.breakdownLabel}>支出</ThemedText>
                          <ThemedText style={[cardStyles.breakdownPct, { color: '#C62828' }]}>
                            {((expenseTotal.total / (incomeTotal.total + expenseTotal.total)) * 100).toFixed(0)}%
                          </ThemedText>
                        </View>
                        <ThemedText style={[cardStyles.breakdownAmount, { color: '#C62828' }]}>
                          {formatCurrency(expenseTotal.total)}
                        </ThemedText>
                        <ThemedText style={cardStyles.breakdownCount}>共 {expenseTotal.count} 笔</ThemedText>
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
  card: {
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 20,
    borderRadius: 16,
  },
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
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 12,
  },
  breakdownBox: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownIcon: {
    fontSize: 18,
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
