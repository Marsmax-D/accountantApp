import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Pressable, ScrollView, View, RefreshControl } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createReportQueries } from '@/db/report-queries';
import {
  getMonthRange, getQuarterRange, getYearRange,
  getPreviousPeriod, getNextPeriod, getPeriodLabel,
} from '@/utils/date-utils';
import { toDateString } from '@/utils/format';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PeriodSelector } from '@/components/reports/PeriodSelector';
import { ComparisonView } from '@/components/reports/ComparisonView';
import { EmptyState } from '@/components/common/EmptyState';
import {
  type ReportType,
  type ComparisonData,
} from '@/types/report';

export default function ReportDetailScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { type: txTypeParam } = useLocalSearchParams<{ type?: string }>();
  const txType = txTypeParam === 'expense' ? 'expense' : 'income';

  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [refDate, setRefDate] = useState(toDateString(new Date()));
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [canGoNext, setCanGoNext] = useState(false);

  const getRange = useCallback((type: ReportType, date: string) => {
    const d = new Date(date + 'T00:00:00');
    switch (type) {
      case 'monthly': return getMonthRange(d.getFullYear(), d.getMonth() + 1);
      case 'quarterly': return getQuarterRange(d.getFullYear(), Math.floor(d.getMonth() / 3) + 1);
      case 'yearly': return getYearRange(d.getFullYear());
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const reportQueries = createReportQueries(db);
      const range = getRange(reportType, refDate);
      const prevRange = getPreviousPeriod(range, reportType);
      const nextRange = getNextPeriod(range, reportType);

      const isIncome = txType === 'income';
      const totalFn = isIncome ? reportQueries.totalIncome : reportQueries.totalExpense;
      const categoryFn = isIncome ? reportQueries.incomeByCategory : reportQueries.expenseByCategory;

      const [current, previous, currentByCat, previousByCat, nextTotal] = await Promise.all([
        totalFn(range.start, range.end),
        totalFn(prevRange.start, prevRange.end),
        categoryFn(range.start, range.end),
        categoryFn(prevRange.start, prevRange.end),
        totalFn(nextRange.start, nextRange.end),
      ]);

      const change = previous.total > 0 ? (current.total - previous.total) / previous.total : 0;

      setComparison({ current, previous, change, currentByCategory: currentByCat, previousByCategory: previousByCat });
      setHasData(current.count > 0 || previous.count > 0);
      setCanGoNext(nextTotal.count > 0);
    } catch (err) {
      console.error('Failed to load comparison:', err);
    }
  }, [db, reportType, refDate, txType, getRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const periodLabel = getPeriodLabel(getRange(reportType, refDate), reportType);
  const prevPeriodLabel = getPeriodLabel(
    getPreviousPeriod(getRange(reportType, refDate), reportType),
    reportType
  );

  const handlePrev = () => {
    const range = getRange(reportType, refDate);
    const prev = getPreviousPeriod(range, reportType);
    setRefDate(prev.start);
  };

  const handleNext = () => {
    const range = getRange(reportType, refDate);
    const next = getNextPeriod(range, reportType);
    setRefDate(next.start);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={styles.cancel}>关闭</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>对比分析</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <PeriodSelector
          reportType={reportType}
          periodLabel={periodLabel}
          onTypeChange={(type) => {
            setReportType(type);
            setRefDate(toDateString(new Date()));
          }}
          onPrev={handlePrev}
          onNext={handleNext}
          hasNext={canGoNext}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {!hasData ? (
            <EmptyState
              icon="📈"
              title="暂无对比数据"
              description="至少需要两个不同时期的数据才能进行对比分析。"
            />
          ) : comparison ? (
            <ComparisonView
              data={comparison}
              currentLabel={periodLabel}
              previousLabel={prevPeriodLabel}
            />
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  cancel: { fontSize: 16 },
  title: { fontSize: 17, fontWeight: '600' },
  placeholder: { width: 40 },
});
