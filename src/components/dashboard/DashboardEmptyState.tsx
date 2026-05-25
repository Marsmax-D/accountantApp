import { StyleSheet } from 'react-native';
import { EmptyState } from '@/components/common/EmptyState';

export function DashboardEmptyState() {
  return (
    <EmptyState
      icon="📋"
      title="还没有记录"
      description="点击右下角的 + 按钮添加你的第一笔收入或支出，或从设置中导入微信账单。"
    />
  );
}
