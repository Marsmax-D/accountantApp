import { useCallback, useState, useRef } from 'react';
import { StyleSheet, ScrollView, RefreshControl, Pressable, View, PanResponder } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createReportQueries } from '@/db/report-queries';
import { createTransactionRepo } from '@/db/transaction-repo';
import {
  getMonthRange, getQuarterRange, getYearRange,
  getPreviousPeriod, getNextPeriod, getPeriodLabel,
} from '@/utils/date-utils';
import { toDateString } from '@/utils/format';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PeriodSelector } from '@/components/reports/PeriodSelector';
import { ReportSummaryCard } from '@/components/reports/ReportSummaryCard';
import { IncomeBarChart } from '@/components/reports/IncomeBarChart';
import { CategoryBreakdown } from '@/components/reports/CategoryBreakdown';
import { EmptyState } from '@/components/common/EmptyState';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import {
  type ReportType,
  type ReportSummary,
  type CategoryBreakdown as CategoryBreakdownType,
  type DailyTotal,
} from '@/types/report';

export default function ReportsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [reportTxType, setReportTxType] = useState<'income' | 'expense'>('income');
  const [refDate, setRefDate] = useState(toDateString(new Date()));
  const [refreshing, setRefreshing] = useState(false);

  const [total, setTotal] = useState<ReportSummary>({ total: 0, count: 0 });
  const [prevTotal, setPrevTotal] = useState<ReportSummary>({ total: 0, count: 0 });
  const [byCategory, setByCategory] = useState<CategoryBreakdownType[]>([]);
  const [daily, setDaily] = useState<DailyTotal[]>([]);
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

      const isIncome = reportTxType === 'income';
      const totalFn = isIncome ? reportQueries.totalIncome : reportQueries.totalExpense;
      const categoryFn = isIncome ? reportQueries.incomeByCategory : reportQueries.expenseByCategory;
      const dailyFn = isIncome ? reportQueries.dailyIncome : reportQueries.dailyExpense;

      const [totalData, prevTotalData, categoryData, dailyData] = await Promise.all([
        totalFn(range.start, range.end),
        totalFn(prevRange.start, prevRange.end),
        categoryFn(range.start, range.end),
        dailyFn(range.start, range.end),
      ]);

      setTotal(totalData);
      setPrevTotal(prevTotalData);
      setByCategory(categoryData);
      setDaily(dailyData);
      setHasData(totalData.count > 0);

      // Check if next period has data
      const nextRange = getNextPeriod(range, reportType);
      const nextData = await totalFn(nextRange.start, nextRange.end);
      setCanGoNext(nextData.count > 0);
    } catch (err) {
      console.error('Failed to load report:', err);
    }
  }, [db, reportType, reportTxType, refDate, getRange]);

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

  const periodLabel = getPeriodLabel(getRange(reportType, refDate), reportType);

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

  const dailyChartData = daily.map(d => ({
    label: d.date.slice(5),
    value: d.total,
  }));

  const reportTypes: ReportType[] = ['monthly', 'quarterly', 'yearly'];

  const cycleReportType = useCallback((direction: 'next' | 'prev') => {
    setReportType((current) => {
      const idx = reportTypes.indexOf(current);
      if (direction === 'next') {
        return reportTypes[(idx + 1) % 3];
      } else {
        return reportTypes[(idx + 2) % 3];
      }
    });
    setRefDate(toDateString(new Date()));
  }, []);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const { dx, dy } = gestureState;
      return Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.5;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -50) {
        cycleReportType('next');
      } else if (gestureState.dx > 50) {
        cycleReportType('prev');
      }
    },
  })).current;

  return (
    <ThemedView style={styles.container} {...panResponder.panHandlers}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText style={styles.pageTitle}>报表</ThemedText>
      </View>

      <View style={styles.reportTypeToggle}>
        <SegmentedControl
          options={[
            { key: 'income', label: '收入报表' },
            { key: 'expense', label: '支出报表' },
          ]}
          selected={reportTxType}
          onSelect={(key) => setReportTxType(key as 'income' | 'expense')}
        />
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
            icon="📊"
            title={`${periodLabel}暂无数据`}
            description={reportTxType === 'income' ? '添加收入记录后，报表将展示详细的数据分析和图表。' : '添加支出记录后，报表将展示详细的数据分析和图表。'}
          />
        ) : (
          <>
            <ReportSummaryCard
              total={total.total}
              count={total.count}
              previousTotal={prevTotal.total}
              dailyAvg={total.count > 0 ? total.total / Math.max(daily.length, 1) : 0}
              title={reportTxType === 'income' ? '总收入' : '总支出'}
              dailyLabel={reportTxType === 'income' ? '日均收入' : '日均支出'}
            />

            {dailyChartData.length > 0 && (
              <IncomeBarChart data={dailyChartData} title={reportTxType === 'income' ? '每日收入趋势' : '每日支出趋势'} />
            )}

            {byCategory.length > 0 && (
              <CategoryBreakdown data={byCategory} total={total.total} />
            )}

            <Pressable
              style={({ pressed }) => [
                styles.compareButton,
                { backgroundColor: '#f0f0f0' },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => router.push(`/report-detail?type=${reportTxType}`)}
            >
              <ThemedText style={styles.compareText}>查看详细对比分析</ThemedText>
              <ThemedText style={styles.compareArrow}>›</ThemedText>
            </Pressable>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 40,
  },
  reportTypeToggle: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
  },
  compareText: {
    fontSize: 15,
    fontWeight: '500',
  },
  compareArrow: {
    fontSize: 20,
    opacity: 0.4,
  },
});
