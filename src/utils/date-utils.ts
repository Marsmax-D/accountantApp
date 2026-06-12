export interface DateRange {
  start: string;
  end: string;
}

export function getMonthRange(year: number, month: number): DateRange {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function getQuarterRange(year: number, quarter: number): DateRange {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;
  const start = `${year}-${String(startMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const end = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function getYearRange(year: number): DateRange {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function getCurrentMonthRange(): DateRange {
  const now = new Date();
  return getMonthRange(now.getFullYear(), now.getMonth() + 1);
}

export function getCurrentQuarterRange(): DateRange {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return getQuarterRange(now.getFullYear(), quarter);
}

export function getCurrentYearRange(): DateRange {
  const now = new Date();
  return getYearRange(now.getFullYear());
}

export function getPreviousPeriod(range: DateRange, type: 'monthly' | 'quarterly' | 'yearly'): DateRange {
  const startDate = new Date(range.start + 'T00:00:00');

  switch (type) {
    case 'monthly': {
      const prev = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
      return getMonthRange(prev.getFullYear(), prev.getMonth() + 1);
    }
    case 'quarterly': {
      const prev = new Date(startDate.getFullYear(), startDate.getMonth() - 3, 1);
      const quarter = Math.floor(prev.getMonth() / 3) + 1;
      return getQuarterRange(prev.getFullYear(), quarter);
    }
    case 'yearly': {
      return getYearRange(startDate.getFullYear() - 1);
    }
  }
}

export function getNextPeriod(range: DateRange, type: 'monthly' | 'quarterly' | 'yearly'): DateRange {
  const startDate = new Date(range.start + 'T00:00:00');

  switch (type) {
    case 'monthly': {
      const next = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
      return getMonthRange(next.getFullYear(), next.getMonth() + 1);
    }
    case 'quarterly': {
      const next = new Date(startDate.getFullYear(), startDate.getMonth() + 3, 1);
      const quarter = Math.floor(next.getMonth() / 3) + 1;
      return getQuarterRange(next.getFullYear(), quarter);
    }
    case 'yearly': {
      return getYearRange(startDate.getFullYear() + 1);
    }
  }
}

export function getPeriodLabel(range: DateRange, type: 'monthly' | 'quarterly' | 'yearly'): string {
  const startDate = new Date(range.start + 'T00:00:00');

  switch (type) {
    case 'monthly':
      return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月`;
    case 'quarterly': {
      const quarter = Math.floor(startDate.getMonth() / 3) + 1;
      return `${startDate.getFullYear()}年第${quarter}季度`;
    }
    case 'yearly':
      return `${startDate.getFullYear()}年`;
  }
}

export function getCurrentPeriodLabel(type: 'monthly' | 'quarterly' | 'yearly'): string {
  const now = new Date();
  switch (type) {
    case 'monthly':
      return `${now.getFullYear()}年${now.getMonth() + 1}月`;
    case 'quarterly': {
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      return `${now.getFullYear()}年第${quarter}季度`;
    }
    case 'yearly':
      return `${now.getFullYear()}年`;
  }
}
