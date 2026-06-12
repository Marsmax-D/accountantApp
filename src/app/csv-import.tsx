import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createTransactionRepo } from '@/db/transaction-repo';
import { getSyncContext, pushChanges } from '@/sync/sync-engine';
import { parseWeChatCsv } from '@/utils/wechat-csv-parser';
import { parseWeChatXlsx } from '@/utils/wechat-xlsx-parser';
import { deduplicate, categorizeWeChatTransaction } from '@/utils/dedup';
import { formatCurrency } from '@/utils/format';
import { type CsvParseResult } from '@/types/csv';

type ImportStep = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error';

export default function CsvImportScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();

  const [step, setStep] = useState<ImportStep>('idle');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [dedupInfo, setDedupInfo] = useState<{ newCount: number; dupCount: number } | null>(null);
  const [importCount, setImportCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file?.uri) return;

      setStep('parsing');
      const isXlsx = file.name?.toLowerCase().endsWith('.xlsx') || file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const parsed = isXlsx ? await parseWeChatXlsx(file.uri) : await parseWeChatCsv(file.uri);
      setParseResult(parsed);

      if (!parsed.success) {
        setErrorMessage(parsed.errors.join('\n'));
        setStep('error');
        return;
      }

      // Dedup
      const syncCtx = await getSyncContext(db);
      const txRepo = createTransactionRepo(db, syncCtx);
      const existingIds = await txRepo.getExistingOrderIds();
      const deduped = deduplicate(parsed.transactions, existingIds);

      setDedupInfo({
        newCount: deduped.newTransactions.length,
        dupCount: deduped.duplicates,
      });

      setStep('preview');
    } catch (err) {
      setErrorMessage(`文件选择失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setStep('error');
    }
  }, [db]);

  const handleImport = useCallback(async () => {
    if (!parseResult || !dedupInfo) return;

    const syncCtx = await getSyncContext(db);
    const txRepo = createTransactionRepo(db, syncCtx);
    const existingIds = await txRepo.getExistingOrderIds();
    const deduped = deduplicate(parseResult.transactions, existingIds);

    if (deduped.newTransactions.length === 0) {
      Alert.alert('提示', '没有新的交易记录需要导入。');
      return;
    }

    setStep('importing');

    let count = 0;
    try {
      for (const tx of deduped.newTransactions) {
        const categoryId = categorizeWeChatTransaction(tx);
        await txRepo.insert({
          amount: tx.amount,
          type: 'income',
          category_id: categoryId,
          source: 'wechat',
          date: tx.transactionDate,
          note: tx.counterparty || tx.note || undefined,
          order_id: tx.orderId,
          wechat_raw: JSON.stringify(tx),
        });
        count++;
      }
      setImportCount(count);
      setStep('done');
      // 有家庭同步时立即推送，不阻塞 UI
      pushChanges(db).catch(() => {});
    } catch (err) {
      setImportCount(count);
      Alert.alert('导入部分完成', `已成功导入 ${count} 条记录。部分记录因错误未能导入。`);
      setStep('done');
      pushChanges(db).catch(() => {});
    }
  }, [db, parseResult, dedupInfo]);

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={styles.cancel}>取消</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>导入微信账单</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {step === 'idle' && (
            <View style={styles.stepContainer}>
              <ThemedText style={styles.stepIcon}>📥</ThemedText>
              <ThemedText style={styles.stepTitle}>选择微信账单文件</ThemedText>
              <ThemedText style={styles.stepDesc}>
                在微信中：我 → 服务 → 钱包 → 账单 → 右上角"..." → 下载账单 → 用于个人对账
                {'\n\n'}导出的文件将通过邮件发送（支持 CSV 和 XLSX 格式），请下载到手机后选择导入。
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.text },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handlePickFile}
              >
                <ThemedText style={[styles.primaryButtonText, { color: theme.background }]}>
                  选择账单文件
                </ThemedText>
              </Pressable>
            </View>
          )}

          {step === 'parsing' && (
            <View style={styles.stepContainer}>
              <ActivityIndicator size="large" color={theme.text} />
              <ThemedText style={styles.parsingText}>正在解析文件...</ThemedText>
            </View>
          )}

          {step === 'preview' && parseResult && dedupInfo && (
            <View style={styles.stepContainer}>
              <ThemedText style={styles.stepIcon}>📋</ThemedText>
              <ThemedText style={styles.stepTitle}>确认导入</ThemedText>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>文件总行数</ThemedText>
                  <ThemedText style={styles.summaryValue}>{parseResult.totalRows}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>识别为收入的记录</ThemedText>
                  <ThemedText style={styles.summaryValue}>{parseResult.parsedRows}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>其中已存在（跳过）</ThemedText>
                  <ThemedText style={[styles.summaryValue, { color: '#FF9800' }]}>
                    {dedupInfo.dupCount}
                  </ThemedText>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                  <ThemedText style={styles.summaryLabelBold}>将导入</ThemedText>
                  <ThemedText style={[styles.summaryValueBold, { color: '#4CAF50' }]}>
                    {dedupInfo.newCount} 条
                  </ThemedText>
                </View>
              </View>

              {parseResult.transactions.length > 0 && (
                <View style={styles.previewSection}>
                  <ThemedText style={styles.previewTitle}>数据预览（前5条）</ThemedText>
                  {parseResult.transactions.slice(0, 5).map((tx, i) => (
                    <View key={i} style={styles.previewRow}>
                      <ThemedText style={styles.previewDate}>{tx.transactionDate}</ThemedText>
                      <ThemedText style={styles.previewAmount}>{formatCurrency(tx.amount)}</ThemedText>
                      <ThemedText style={styles.previewNote} numberOfLines={1}>
                        {tx.counterparty || tx.description}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.buttonGroup}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: '#4CAF50' },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleImport}
                >
                  <ThemedText style={styles.primaryButtonText}>确认导入</ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={handlePickFile}
                >
                  <ThemedText style={styles.secondaryButtonText}>重新选择文件</ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          {step === 'importing' && (
            <View style={styles.stepContainer}>
              <ActivityIndicator size="large" color={theme.text} />
              <ThemedText style={styles.parsingText}>正在导入数据...</ThemedText>
            </View>
          )}

          {step === 'done' && (
            <View style={styles.stepContainer}>
              <ThemedText style={styles.stepIcon}>✅</ThemedText>
              <ThemedText style={styles.stepTitle}>导入完成</ThemedText>
              <ThemedText style={styles.doneCount}>
                成功导入 {importCount} 条收入记录
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.text },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleDone}
              >
                <ThemedText style={[styles.primaryButtonText, { color: theme.background }]}>
                  完成
                </ThemedText>
              </Pressable>
            </View>
          )}

          {step === 'error' && (
            <View style={styles.stepContainer}>
              <ThemedText style={styles.stepIcon}>❌</ThemedText>
              <ThemedText style={styles.stepTitle}>导入失败</ThemedText>
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.text },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setStep('idle')}
              >
                <ThemedText style={[styles.primaryButtonText, { color: theme.background }]}>
                  重试
                </ThemedText>
              </Pressable>
            </View>
          )}
        </ScrollView>
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
  placeholder: { width: 40 },
  content: { flex: 1 },
  contentInner: { padding: 24 },
  stepContainer: { alignItems: 'center', paddingTop: 40 },
  stepIcon: { fontSize: 48, marginBottom: 16 },
  stepTitle: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  stepDesc: { fontSize: 14, opacity: 0.6, lineHeight: 22, textAlign: 'center', marginBottom: 32 },
  parsingText: { fontSize: 15, opacity: 0.6, marginTop: 16 },
  primaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 16, fontWeight: '600' },
  secondaryButton: { paddingVertical: 12, marginTop: 8 },
  secondaryButtonText: { fontSize: 15, opacity: 0.6 },
  summaryCard: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  summaryRowTotal: {
    borderBottomWidth: 0,
    marginTop: 4,
    paddingTop: 12,
  },
  summaryLabel: { fontSize: 15 },
  summaryLabelBold: { fontSize: 16, fontWeight: '600' },
  summaryValue: { fontSize: 15 },
  summaryValueBold: { fontSize: 16, fontWeight: '700' },
  previewSection: { width: '100%', marginBottom: 20 },
  previewTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  previewDate: { fontSize: 12, width: 90, opacity: 0.6 },
  previewAmount: { fontSize: 13, fontWeight: '600', width: 80, textAlign: 'right' },
  previewNote: { fontSize: 12, flex: 1, marginLeft: 8, opacity: 0.5 },
  buttonGroup: { width: '100%', gap: 8, alignItems: 'center' },
  doneCount: { fontSize: 16, opacity: 0.7, marginBottom: 24 },
  errorText: { fontSize: 14, color: '#FF3B30', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
});
