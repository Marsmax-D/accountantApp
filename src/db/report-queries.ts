import { type SQLiteDatabase } from 'expo-sqlite';
import { REPORT_QUERIES } from './schema';
import {
  type ReportSummary,
  type CategoryBreakdown,
  type DailyTotal,
  type MonthlyTotal,
  type SourceBreakdown,
} from '@/types/report';

export function createReportQueries(db: SQLiteDatabase) {
  return {
    async totalIncome(dateFrom: string, dateTo: string): Promise<ReportSummary> {
      const result = await db.getAllAsync<ReportSummary>(REPORT_QUERIES.totalIncome, dateFrom, dateTo);
      return result[0] ?? { total: 0, count: 0 };
    },

    async incomeByCategory(dateFrom: string, dateTo: string): Promise<CategoryBreakdown[]> {
      return await db.getAllAsync<CategoryBreakdown>(REPORT_QUERIES.incomeByCategory, dateFrom, dateTo);
    },

    async dailyIncome(dateFrom: string, dateTo: string): Promise<DailyTotal[]> {
      return await db.getAllAsync<DailyTotal>(REPORT_QUERIES.dailyIncome, dateFrom, dateTo);
    },

    async monthlyIncome(dateFrom: string, dateTo: string): Promise<MonthlyTotal[]> {
      return await db.getAllAsync<MonthlyTotal>(REPORT_QUERIES.monthlyIncome, dateFrom, dateTo);
    },

    async incomeBySource(dateFrom: string, dateTo: string): Promise<SourceBreakdown[]> {
      return await db.getAllAsync<SourceBreakdown>(REPORT_QUERIES.incomeBySource, dateFrom, dateTo);
    },
  };
}

export type ReportQueries = ReturnType<typeof createReportQueries>;
