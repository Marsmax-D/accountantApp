import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, Pressable, View, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import { createCategoryRepo } from '@/db/category-repo';
import { createTransactionRepo } from '@/db/transaction-repo';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { type Category } from '@/types/transaction';
import { Spacing } from '@/constants/theme';

interface SettingsItem {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  action: () => void;
}

interface StatCard {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [incomeTxCount, setIncomeTxCount] = useState(0);
  const [expenseTxCount, setExpenseTxCount] = useState(0);

  const loadData = useCallback(async () => {
    const catRepo = createCategoryRepo(db);
    const [incomeCats, expenseCats] = await Promise.all([
      catRepo.getIncomeCategories(),
      catRepo.getExpenseCategories(),
    ]);
    setIncomeCategories(incomeCats);
    setExpenseCategories(expenseCats);

    const txRepo = createTransactionRepo(db);
    const [incomeCount, expenseCount] = await Promise.all([
      txRepo.count('income'),
      txRepo.count('expense'),
    ]);
    setIncomeTxCount(incomeCount);
    setExpenseTxCount(expenseCount);
  }, [db]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async () => {
    try {
      const txRepo = createTransactionRepo(db);
      const all = await txRepo.getAll({ limit: 10000 });

      if (all.length === 0) {
        Alert.alert('提示', '暂无数据可导出');
        return;
      }

      let csv = '日期,金额,分类,来源,备注\n';
      for (const tx of all) {
        csv += `${tx.date},${tx.amount},${tx.category_name},${tx.source},${tx.note ?? ''}\n`;
      }

      const fileName = `accounter_export_${Date.now()}.csv`;
      const exportFile = new File(Paths.cache, fileName);
      await exportFile.write(csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(exportFile.uri, {
          mimeType: 'text/csv',
          dialogTitle: '导出账单数据',
        });
      } else {
        Alert.alert('提示', `文件已保存到: ${exportFile.uri}`);
      }
    } catch (err) {
      Alert.alert('导出失败', '请稍后重试');
    }
  };

  const handleClearData = async () => {
    setShowConfirm(true);
  };

  const confirmClear = async () => {
    try {
      const txRepo = createTransactionRepo(db);
      await db.runAsync('DELETE FROM transactions');
      setIncomeTxCount(0);
      setExpenseTxCount(0);
      Alert.alert('已完成', '所有交易数据已清除');
    } catch (err) {
      Alert.alert('清除失败', '请稍后重试');
    }
    setShowConfirm(false);
  };

  const functionItems: SettingsItem[] = [
    {
      icon: 'people',
      iconColor: '#5B9BD5',
      title: '家庭账单',
      subtitle: '创建或加入家庭，与朋友共享账本',
      action: () => router.push('/family' as any),
    },
    {
      icon: 'cloud-download',
      iconColor: '#4CAF50',
      title: '导入微信账单',
      subtitle: '从微信导出的 CSV 文件中导入收入数据',
      action: () => router.push('/csv-import'),
    },
    {
      icon: 'folder-open',
      iconColor: '#FF9800',
      title: '分类管理',
      subtitle: `收入 ${incomeCategories.length} 个 · 支出 ${expenseCategories.length} 个`,
      action: () => router.push('/category-manage'),
    },
  ];

  const dataItems: SettingsItem[] = [
    {
      icon: 'share-outline',
      iconColor: '#2196F3',
      title: '导出数据',
      subtitle: '将所有数据导出为 CSV 文件',
      action: handleExport,
    },
    {
      icon: 'sync-outline',
      iconColor: '#9C27B0',
      title: '压缩数据库',
      subtitle: '优化存储空间（VACUUM）',
      action: async () => {
        try {
          await db.execAsync('VACUUM');
          Alert.alert('完成', '数据库已优化');
        } catch {
          Alert.alert('失败', '数据库优化失败');
        }
      },
    },
    {
      icon: 'trash-outline',
      iconColor: '#F44336',
      title: '清除所有数据',
      subtitle: '删除所有交易记录（分类保留）',
      action: handleClearData,
    },
  ];

  const statCards: StatCard[] = [
    { label: '收入笔数', value: incomeTxCount, icon: 'trending-up', color: '#4CAF50' },
    { label: '支出笔数', value: expenseTxCount, icon: 'trending-down', color: '#F44336' },
    { label: '收入分类', value: incomeCategories.length, icon: 'pricetags', color: '#FF9800' },
    { label: '支出分类', value: expenseCategories.length, icon: 'pricetags', color: '#2196F3' },
  ];

  return (
    <ThemedView style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText type="subtitle" style={s.pageTitle}>
          设置
        </ThemedText>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 功能 section */}
        <ThemedText themeColor="textSecondary" style={s.sectionLabel}>
          功能
        </ThemedText>
        <ThemedView type="backgroundElement" style={s.card}>
          {functionItems.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                s.item,
                index < functionItems.length - 1 && s.itemBorder,
                pressed && { opacity: 0.6 },
              ]}
              onPress={item.action}
            >
              <View style={[s.iconWrap, { backgroundColor: item.iconColor + '20' }]}>
                <Ionicons name={item.icon} size={22} color={item.iconColor} />
              </View>
              <View style={s.itemInfo}>
                <ThemedText style={s.itemTitle}>{item.title}</ThemedText>
                <ThemedText themeColor="textSecondary" style={s.itemSubtitle}>
                  {item.subtitle}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          ))}
        </ThemedView>

        {/* 数据管理 section */}
        <ThemedText themeColor="textSecondary" style={s.sectionLabel}>
          数据管理
        </ThemedText>
        <ThemedView type="backgroundElement" style={s.card}>
          {dataItems.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                s.item,
                index < dataItems.length - 1 && s.itemBorder,
                pressed && { opacity: 0.6 },
              ]}
              onPress={item.action}
            >
              <View style={[s.iconWrap, { backgroundColor: item.iconColor + '20' }]}>
                <Ionicons name={item.icon} size={22} color={item.iconColor} />
              </View>
              <View style={s.itemInfo}>
                <ThemedText style={s.itemTitle}>{item.title}</ThemedText>
                <ThemedText themeColor="textSecondary" style={s.itemSubtitle}>
                  {item.subtitle}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          ))}
        </ThemedView>

        {/* 数据统计 — 2x2 卡片网格 */}
        <ThemedText themeColor="textSecondary" style={s.sectionLabel}>
          数据统计
        </ThemedText>
        <View style={s.statsGrid}>
          {statCards.map((stat, index) => (
            <ThemedView key={index} type="backgroundElement" style={s.statCard}>
              <View style={[s.statIconWrap, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <ThemedText style={s.statValue}>{stat.value}</ThemedText>
              <ThemedText themeColor="textSecondary" style={s.statLabel}>
                {stat.label}
              </ThemedText>
            </ThemedView>
          ))}
        </View>

        {/* 关于 */}
        <ThemedText themeColor="textSecondary" style={s.sectionLabel}>
          关于
        </ThemedText>
        <ThemedView type="backgroundElement" style={[s.card, s.aboutCard]}>
          <View style={s.aboutLogo}>
            <Ionicons name="wallet-outline" size={28} color={theme.text} />
          </View>
          <ThemedText style={s.aboutName}>管账人</ThemedText>
          <ThemedText themeColor="textSecondary" style={s.aboutVersion}>
            版本 1.0.0
          </ThemedText>
        </ThemedView>
      </ScrollView>

      <ConfirmDialog
        visible={showConfirm}
        title="清除所有数据"
        message="此操作将删除所有交易记录，且不可恢复。分类数据将保留。确定要继续吗？"
        confirmText="确认清除"
        cancelText="取消"
        onConfirm={confirmClear}
        onCancel={() => setShowConfirm(false)}
        destructive
      />
    </ThemedView>
  );
}

const BORDER = { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' };

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },

  // Section
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
    marginLeft: Spacing.one,
  },

  // Card
  card: {
    borderRadius: 14,
    overflow: 'hidden',
  },

  // Item row
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
  },
  itemBorder: BORDER,
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48.5%',
    borderRadius: 14,
    padding: Spacing.three,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // About
  aboutCard: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  aboutLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  aboutName: {
    fontSize: 17,
    fontWeight: '600',
  },
  aboutVersion: {
    fontSize: 13,
    marginTop: 2,
  },
});
