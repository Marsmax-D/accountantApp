export interface ReportSummary {
  total: number;
  count: number;
}

export interface CategoryBreakdown {
  name: string;
  color: string | null;
  icon: string | null;
  total: number;
  count: number;
}

export interface DailyTotal {
  date: string;
  total: number;
}

export interface MonthlyTotal {
  month: string; // YYYY-MM
  total: number;
}

export interface SourceBreakdown {
  source: 'wechat' | 'manual';
  total: number;
  count: number;
}

export interface ComparisonData {
  current: ReportSummary;
  previous: ReportSummary;
  change: number; // percentage change
  currentByCategory: CategoryBreakdown[];
  previousByCategory: CategoryBreakdown[];
}

export type ReportType = 'monthly' | 'quarterly' | 'yearly';
