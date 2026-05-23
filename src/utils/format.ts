const LOCALE: Intl.NumberFormatOptions = {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', LOCALE)}`;
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

export function formatMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-');
  return `${y}年${parseInt(m)}月`;
}

export function formatYear(yearStr: string): string {
  return `${yearStr}年`;
}

export function formatRelativeDate(dateStr: string): string {
  const today = new Date();
  const todayStr = toDateString(today);
  const yesterdayStr = toDateString(new Date(today.getTime() - 86400000));

  if (dateStr === todayStr) return '今天';
  if (dateStr === yesterdayStr) return '昨天';

  const date = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);

  if (diffDays < 7 && diffDays > 0) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekDays[date.getDay()];
  }

  return formatDate(dateStr);
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthName(monthNum: number): string {
  const names = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return names[monthNum - 1] ?? '';
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}
