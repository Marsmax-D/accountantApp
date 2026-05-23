import { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createTransactionRepo } from '@/db/transaction-repo';
import { createReportQueries } from '@/db/report-queries';
import { createCategoryRepo } from '@/db/category-repo';
import { getCurrentMonthRange, getPreviousPeriod } from '@/utils/date-utils';
import { useTheme } from '@/hooks/use-theme';
import { ThemedView } from '@/components/themed-view';
import { IncomeTotalCard } from '@/components/dashboard/IncomeTotalCard';
import { SourceBreakdown } from '@/components/dashboard/SourceBreakdown';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { FloatingActionButton } from '@/components/common/FloatingActionButton';
import {
  type ReportSummary,
  type CategoryBreakdown,
  type DailyTotal,
  type SourceBreakdown as SourceBreakdownType,
} from '@/types/report';
import { type TransactionWithCategory } from '@/types/transaction';

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState<ReportSummary>({ total: 0, count: 0 });
  const [prevTotal, setPrevTotal] = useState<ReportSummary>({ total: 0, count: 0 });
  const [bySource, setBySource] = useState<SourceBreakdownType[]>([]);
  const [recent, setRecent] = useState<TransactionWithCategory[]>([]);
  const [hasData, setHasData] = useState(false);

  const periodLabel = `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`;

  const loadData = useCallback(async () => {
    try {
      const txRepo = createTransactionRepo(db);
      const reportQueries = createReportQueries(db);

      const range = getCurrentMonthRange();
      const prevRange = getPreviousPeriod(range, 'monthly');

      const [totalData, prevTotalData, sourceData, recentData] = await Promise.all([
        reportQueries.totalIncome(range.start, range.end),
        reportQueries.totalIncome(prevRange.start, prevRange.end),
        reportQueries.incomeBySource(range.start, range.end),
        txRepo.getRecent(5),
      ]);

      setTotal(totalData);
      setPrevTotal(prevTotalData);
      setBySource(sourceData);
      setRecent(recentData);
      setHasData(totalData.count > 0 || recentData.length > 0);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {!hasData ? (
            <DashboardEmptyState />
          ) : (
            <>
              <IncomeTotalCard
                total={total.total}
                count={total.count}
                previousTotal={prevTotal.total}
                periodLabel={periodLabel}
              />
              <SourceBreakdown data={bySource} total={total.total} />
              <RecentTransactions
                transactions={recent}
                onViewAll={() => router.push('/transactions')}
              />
            </>
          )}
        </ScrollView>

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
