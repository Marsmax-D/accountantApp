import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { createTransactionRepo } from '@/db/transaction-repo';
import { createCategoryRepo } from '@/db/category-repo';
import { toDateString } from '@/utils/format';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryPicker } from '@/components/common/CategoryPicker';
import { type Category, type TransactionWithCategory } from '@/types/transaction';

export default function AddTransactionScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(toDateString(new Date()));
  const [note, setNote] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const dateObj = new Date(date + 'T00:00:00');

  useEffect(() => {
    const repo = createCategoryRepo(db);
    repo.getIncomeCategories().then((cats) => {
      setCategories(cats);
      // 默认选中"微信商户收款"(id=5)
      const defaultCat = cats.find((c) => c.id === 5);
      if (defaultCat && !id) {
        setSelectedCategory(defaultCat);
      }
    });
  }, [db, id]);

  // Edit mode: load existing transaction
  useEffect(() => {
    if (!id) return;
    setLoadingEdit(true);
    const txRepo = createTransactionRepo(db);
    txRepo.getById(parseInt(id)).then((tx) => {
      if (tx) {
        setAmount(String(tx.amount));
        setDate(tx.date);
        setNote(tx.note ?? '');
        // find matching category
        const catRepo = createCategoryRepo(db);
        catRepo.getIncomeCategories().then((cats) => {
          const cat = cats.find((c) => c.id === tx.category_id);
          if (cat) setSelectedCategory(cat);
        });
      }
    }).finally(() => setLoadingEdit(false));
  }, [db, id]);

  const canSave = amount.trim().length > 0 && parseFloat(amount) > 0 && selectedCategory !== null;

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;

    setSaving(true);
    try {
      const txRepo = createTransactionRepo(db);
      if (isEditing && id) {
        await txRepo.update(parseInt(id), {
          amount: parseFloat(amount),
          category_id: selectedCategory!.id,
          date,
          note: note.trim() || null,
        });
      } else {
        await txRepo.insert({
          amount: parseFloat(amount),
          type: 'income',
          category_id: selectedCategory!.id,
          source: 'manual',
          date,
          note: note.trim() || undefined,
        });
      }
      router.back();
    } catch (err) {
      Alert.alert('保存失败', '请稍后重试');
    } finally {
      setSaving(false);
    }
  }, [amount, selectedCategory, date, note, db, canSave, saving, router, isEditing, id]);

  const dateStr = `${date.slice(0, 4)}年${parseInt(date.slice(5, 7))}月${parseInt(date.slice(8, 10))}日`;

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(toDateString(selectedDate));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <ThemedText style={styles.cancel}>取消</ThemedText>
            </Pressable>
            <ThemedText style={styles.title}>{isEditing ? '编辑收入' : '记一笔收入'}</ThemedText>
            <Pressable
              onPress={handleSave}
              disabled={!canSave || saving}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: canSave ? theme.text : '#ccc' },
                pressed && { opacity: 0.8 },
              ]}
            >
              <ThemedText style={[styles.saveText, { color: theme.background }]}>
                {saving ? '保存中...' : '保存'}
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            <View style={styles.amountSection}>
              <ThemedText style={styles.currencySign}>¥</ThemedText>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor="#ccc"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                autoFocus={!isEditing}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.fieldRow,
                pressed && { opacity: 0.6 },
              ]}
              onPress={() => setShowPicker(true)}
            >
              <ThemedText style={styles.fieldLabel}>分类</ThemedText>
              <View style={styles.fieldValue}>
                {selectedCategory && (
                  <View style={[styles.categoryDot, { backgroundColor: selectedCategory.color ?? '#999' }]} />
                )}
                <ThemedText style={styles.fieldText}>
                  {selectedCategory?.name ?? '请选择'}
                </ThemedText>
                <ThemedText style={styles.arrow}>›</ThemedText>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.fieldRow,
                pressed && { opacity: 0.6 },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <ThemedText style={styles.fieldLabel}>日期</ThemedText>
              <View style={styles.fieldValue}>
                <ThemedText style={styles.fieldText}>{dateStr}</ThemedText>
                <ThemedText style={styles.arrow}>›</ThemedText>
              </View>
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            <View style={styles.noteSection}>
              <ThemedText style={styles.fieldLabel}>备注</ThemedText>
              <TextInput
                style={[styles.noteInput, { color: theme.text, borderColor: theme.backgroundElement }]}
                placeholder="添加备注（可选）"
                placeholderTextColor="#aaa"
                value={note}
                onChangeText={setNote}
                multiline
              />
            </View>
          </ScrollView>

          <CategoryPicker
            categories={categories}
            selectedId={selectedCategory?.id ?? null}
            onSelect={setSelectedCategory}
            visible={showPicker}
            onClose={() => setShowPicker(false)}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveText: { fontSize: 15, fontWeight: '600' },
  form: { flex: 1, paddingHorizontal: 20 },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  currencySign: { fontSize: 28, fontWeight: '300', marginRight: 4, marginTop: 8 },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'left',
    minWidth: 200,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  fieldLabel: { fontSize: 16 },
  fieldValue: { flexDirection: 'row', alignItems: 'center' },
  fieldText: { fontSize: 16, opacity: 0.7 },
  arrow: { fontSize: 20, opacity: 0.4, marginLeft: 4 },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  noteSection: {
    paddingVertical: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
