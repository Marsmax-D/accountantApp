import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFamilyStore } from '@/store/use-family-store';
import { createTransactionRepo } from '@/db/transaction-repo';
import { createReportQueries } from '@/db/report-queries';
import { createCategoryRepo } from '@/db/category-repo';
import { toDateString } from '@/utils/format';
import { useTheme } from '@/hooks/use-theme';
import { ThemedView } from '@/components/themed-view';
import { IncomeTotalCard } from '@/components/dashboard/IncomeTotalCard';
import { IncomeByChannel } from '@/components/dashboard/IncomeByChannel';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { FloatingActionButton } from '@/components/common/FloatingActionButton';
import {
  type ReportSummary,
  type CategoryBreakdown,
  type DailyTotal,
  type ChannelBreakdown,
} from '@/types/report';
import { type TransactionWithCategory } from '@/types/transaction';

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState<ReportSummary>({ total: 0, count: 0 });
  const [prevTotal, setPrevTotal] = useState<ReportSummary>({ total: 0, count: 0 });
  const [byChannel, setByChannel] = useState<ChannelBreakdown[]>([]);
  const [recent, setRecent] = useState<TransactionWithCategory[]>([]);
  const [hasData, setHasData] = useState(false);

  const now = new Date();
  const todayStr = toDateString(now);
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayStr = toDateString(yesterday);
  const periodLabel = `${now.getMonth() + 1}月${now.getDate()}日`;

  const loadData = useCallback(async () => {
    try {
      const txRepo = createTransactionRepo(db);
      const reportQueries = createReportQueries(db);

      const [totalData, prevTotalData, channelData, recentData] = await Promise.all([
        reportQueries.totalIncome(todayStr, todayStr),
        reportQueries.totalIncome(yesterdayStr, yesterdayStr),
        reportQueries.incomeByChannel(todayStr, todayStr),
        txRepo.getRecent(5),
      ]);

      setTotal(totalData);
      setPrevTotal(prevTotalData);
      setByChannel(channelData);
      setRecent(recentData);
      setHasData(totalData.count > 0 || recentData.length > 0);
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
                comparisonLabel="较昨日"
              />
              <IncomeByChannel data={byChannel} total={total.total} />
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
