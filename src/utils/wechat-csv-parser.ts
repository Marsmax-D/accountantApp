import { File } from 'expo-file-system';
import Papa from 'papaparse';
import { type WeChatTransaction, type CsvParseResult } from '@/types/csv';

const WECHAT_COLUMN_MAP: Record<string, string> = {
  '交易时间': 'transactionDate',
  '交易类型': 'type',
  '交易对方': 'counterparty',
  '商品说明': 'description',
  '商品': 'description',
  '收/支': 'incomeExpense',
  '金额(元)': 'amount',
  '支付方式': 'paymentMethod',
  '当前状态': 'status',
  '交易状态': 'status',
  '交易单号': 'orderId',
  '商户单号': 'merchantOrderId',
  '备注': 'note',
};

function detectEncoding(bytes: Uint8Array): 'utf-8' | 'gbk' {
  // Check BOM for UTF-8
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8';
  }
  // Check BOM for UTF-16 LE
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'utf-8';
  }
  // Try decoding as UTF-8, check for replacement characters
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // Check if the decoded text is likely Chinese (contains CJK characters)
    if (/[一-鿿]/.test(decoded)) {
      return 'utf-8';
    }
  } catch {
    // UTF-8 decoding failed, likely GBK
    return 'gbk';
  }
  return 'gbk';
}

function parseAmount(val: string): number {
  const cleaned = val.replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned) || 0;
}

function formatDate(raw: string): string {
  // WeChat format: "2024-01-15 08:30:15" or "2024/01/15 08:30"
  const cleaned = raw.replace(/\//g, '-').trim();
  const datePart = cleaned.split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return raw;
}

export async function parseWeChatCsv(uri: string): Promise<CsvParseResult> {
  const result: CsvParseResult = {
    success: false,
    transactions: [],
    errors: [],
    totalRows: 0,
    parsedRows: 0,
  };

  try {
    const file = new File(uri);
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const encoding = detectEncoding(bytes);
    let text: string;

    if (encoding === 'gbk') {
      // Try TextDecoder with gbk, fallback to utf-8
      try {
        text = new TextDecoder('gbk', { fatal: false }).decode(bytes);
      } catch {
        text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        result.errors.push('编码检测为GBK但解码失败，使用UTF-8作为后备');
      }
    } else {
      text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }

    // Remove BOM if present
    text = text.replace(/^﻿/, '');

    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      result.errors.push(...parsed.errors.map(e => `第${e.row}行: ${e.message}`));
    }

    result.totalRows = parsed.data.length;

    for (const row of parsed.data) {
      try {
        const mapped: Record<string, string> = {};
        for (const [colName, val] of Object.entries(row)) {
          const mappedKey = WECHAT_COLUMN_MAP[colName.trim()];
          if (mappedKey) {
            mapped[mappedKey] = val?.trim() ?? '';
          }
        }

        // Only process income rows
        const incomeExpense = mapped['incomeExpense'] || '';
        if (incomeExpense !== '收入' && incomeExpense !== '') {
          continue;
        }

        // Skip rows that don't have required fields
        const amount = parseAmount(mapped['amount'] || '0');
        if (amount <= 0) continue;

        const tx: WeChatTransaction = {
          transactionDate: formatDate(mapped['transactionDate'] || ''),
          type: mapped['type'] || '',
          counterparty: mapped['counterparty'] || '',
          description: mapped['description'] || '',
          amount,
          incomeExpense: '收入',
          paymentMethod: mapped['paymentMethod'] || '',
          status: mapped['status'] || '',
          orderId: mapped['orderId'] || '',
          merchantOrderId: mapped['merchantOrderId'] || '',
          note: mapped['note'] || '',
        };

        result.transactions.push(tx);
        result.parsedRows++;
      } catch {
        // Skip malformed rows
        result.errors.push(`跳过无法解析的行: ${JSON.stringify(row).slice(0, 100)}`);
      }
    }

    result.success = result.parsedRows > 0;
  } catch (err) {
    result.errors.push(`文件读取失败: ${err instanceof Error ? err.message : '未知错误'}`);
  }

  return result;
}
