import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, Pressable, View, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { createCategoryRepo } from '@/db/category-repo';
import { createTransactionRepo } from '@/db/transaction-repo';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { type Category } from '@/types/transaction';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<Category[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [transactionCount, setTransactionCount] = useState(0);

  const loadData = useCallback(async () => {
    const catRepo = createCategoryRepo(db);
    const cats = await catRepo.getIncomeCategories();
    setCategories(cats);

    const txRepo = createTransactionRepo(db);
    const all = await txRepo.getAll({ limit: 1 });
    if (all.length > 0) {
      setTransactionCount(prev => prev + 1); // approximate
    }
  }, [db]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleManageCategories = () => {
    const catList = categories
      .map(c => `${c.name}${c.is_system ? ' (系统)' : ''}`)
      .join('\n');
    Alert.alert('当前收入分类', catList);
  };

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
      // Delete all transactions
      await db.runAsync('DELETE FROM transactions');
      setTransactionCount(0);
      Alert.alert('已完成', '所有交易数据已清除');
    } catch (err) {
      Alert.alert('清除失败', '请稍后重试');
    }
    setShowConfirm(false);
  };

  const settingsItems = [
    {
      icon: '📥',
      title: '导入微信账单',
      subtitle: '从微信导出的 CSV 文件中导入收入数据',
      action: () => router.push('/csv-import'),
      badge: null as string | null,
    },
    {
      icon: '📂',
      title: '收入分类',
      subtitle: `共 ${categories.length} 个分类`,
      action: () => router.push('/category-manage'),
      badge: null,
    },
    {
      icon: '📤',
      title: '导出数据',
      subtitle: '将所有数据导出为 CSV 文件',
      action: handleExport,
      badge: null,
    },
    {
      icon: '🗜️',
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
      badge: null,
    },
    {
      icon: '🗑️',
      title: '清除所有数据',
      subtitle: '删除所有交易记录（分类保留）',
      action: handleClearData,
      badge: null,
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText style={styles.pageTitle}>设置</ThemedText>
      </View>

      <ScrollView style={styles.list}>
        {settingsItems.map((item, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.item,
              pressed && { opacity: 0.6 },
            ]}
            onPress={item.action}
          >
            <ThemedText style={styles.itemIcon}>{item.icon}</ThemedText>
            <View style={styles.itemInfo}>
              <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
              <ThemedText style={styles.itemSubtitle}>{item.subtitle}</ThemedText>
            </View>
            <ThemedText style={styles.arrow}>›</ThemedText>
          </Pressable>
        ))}

        <View style={styles.statsSection}>
          <ThemedText style={styles.statsTitle}>数据统计</ThemedText>
          <View style={styles.statsRow}>
            <ThemedText style={styles.statsLabel}>交易笔数</ThemedText>
            <ThemedText style={styles.statsValue}>{transactionCount}</ThemedText>
          </View>
          <View style={styles.statsRow}>
            <ThemedText style={styles.statsLabel}>收入分类</ThemedText>
            <ThemedText style={styles.statsValue}>{categories.length}</ThemedText>
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.version}>AccounterApp v1.0.0</ThemedText>
        </View>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 13,
    opacity: 0.5,
    marginTop: 2,
  },
  arrow: {
    fontSize: 20,
    opacity: 0.4,
    marginLeft: 8,
  },
  statsSection: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statsLabel: {
    fontSize: 14,
    opacity: 0.6,
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  version: {
    fontSize: 13,
    opacity: 0.4,
  },
});
