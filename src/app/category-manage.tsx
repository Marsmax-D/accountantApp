import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createCategoryRepo } from '@/db/category-repo';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { type Category } from '@/types/transaction';

export default function CategoryManageScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const loadData = useCallback(async () => {
    const repo = createCategoryRepo(db);
    const cats = await repo.getIncomeCategories();
    setCategories(cats);
  }, [db]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;

    try {
      const repo = createCategoryRepo(db);
      await repo.insert({
        name,
        type: 'income',
        source: 'manual',
      });
      setNewName('');
      setAddMode(false);
      await loadData();
    } catch (err) {
      Alert.alert('添加失败', '请稍后重试');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const repo = createCategoryRepo(db);
      await repo.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      Alert.alert('删除失败', '该分类下存在交易记录，无法删除');
      setDeleteTarget(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={styles.cancel}>完成</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>管理分类</ThemedText>
          <Pressable onPress={() => setAddMode(true)}>
            <ThemedText style={styles.add}>添加</ThemedText>
          </Pressable>
        </View>

        <ScrollView style={styles.list}>
          {addMode && (
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundElement }]}
                placeholder="输入分类名称"
                placeholderTextColor="#aaa"
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  { backgroundColor: theme.text },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleAdd}
              >
                <ThemedText style={[styles.saveBtnText, { color: theme.background }]}>保存</ThemedText>
              </Pressable>
            </View>
          )}

          {categories.map((cat) => (
            <View key={cat.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: cat.color ?? '#999' }]} />
              <View style={styles.info}>
                <ThemedText style={styles.name}>{cat.name}</ThemedText>
                <ThemedText style={styles.meta}>
                  {cat.is_system ? '系统分类' : '自定义'}
                  {' · '}
                  {cat.source === 'wechat' ? '微信导入' : cat.source === 'manual' ? '手动' : '通用'}
                </ThemedText>
              </View>
              {!cat.is_system && (
                <Pressable
                  style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                  onPress={() => setDeleteTarget(cat)}
                >
                  <ThemedText style={styles.deleteText}>删除</ThemedText>
                </Pressable>
              )}
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>

        <ConfirmDialog
          visible={deleteTarget !== null}
          title="删除分类"
          message={`确定要删除"${deleteTarget?.name}"吗？如果该分类下有交易记录，将无法删除。`}
          confirmText="删除"
          cancelText="取消"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          destructive
        />
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
  add: { fontSize: 16, fontWeight: '500', color: '#4CAF50' },
  list: { paddingHorizontal: 16 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500' },
  meta: { fontSize: 12, opacity: 0.5, marginTop: 2 },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFEBEE',
  },
  deleteText: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '500',
  },
});
