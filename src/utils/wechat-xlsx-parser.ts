import { File } from 'expo-file-system';
import * as XLSX from 'xlsx';
import { type WeChatTransaction, type CsvParseResult } from '@/types/csv';

const COLUMN_MAP: Record<string, string> = {
  '交易时间': 'transactionDate',
  '交易类型': 'type',
  '交易对方': 'counterparty',
  '商品说明': 'description',
  '商品': 'description',
  '收/支': 'incomeExpense',
  '金额(元)': 'amount',
  '金额': 'amount',
  '支付方式': 'paymentMethod',
  '当前状态': 'status',
  '交易状态': 'status',
  '交易单号': 'orderId',
  '商户单号': 'merchantOrderId',
  '备注': 'note',
};

function parseAmount(val: string | number | undefined): number {
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned) || 0;
}

function formatDate(raw: string): string {
  const cleaned = String(raw).replace(/\//g, '-').trim();
  const datePart = cleaned.split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return raw;
}

export async function parseWeChatXlsx(uri: string): Promise<CsvParseResult> {
  const result: CsvParseResult = {
    success: false,
    transactions: [],
    errors: [],
    totalRows: 0,
    parsedRows: 0,
  };

  try {
    const file = new File(uri);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      result.errors.push('工作簿中没有找到表格');
      return result;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(sheet, { header: 1 });

    // Find header row
    let headerRow = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const rowStr = row.map(String);
      if (rowStr.some(c => c.includes('交易时间') || c.includes('收/支'))) {
        headerRow = i;
        break;
      }
    }

    if (headerRow === -1) {
      result.errors.push('未找到表头行，请确认文件是微信导出的账单');
      return result;
    }

    const headers = rows[headerRow].map(h => String(h ?? '').trim());
    // Map column indices
    const colIndex: Record<string, number> = {};
    headers.forEach((h, i) => {
      const mapped = COLUMN_MAP[h];
      if (mapped) colIndex[mapped] = i;
    });

    result.totalRows = rows.length - headerRow - 1;

    // Parse data rows (skip header)
    for (let i = headerRow + 1; i < rows.length; i++) {
      try {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        // Check if it's an income row
        const incomeIdx = colIndex['incomeExpense'];
        const incomeExpense = incomeIdx !== undefined ? String(row[incomeIdx] ?? '').trim() : '';
        if (incomeExpense !== '收入' && incomeExpense !== '') continue;

        // Parse amount
        const amountIdx = colIndex['amount'];
        const amount = amountIdx !== undefined ? parseAmount(row[amountIdx]) : 0;
        if (amount <= 0) continue;

        const getVal = (key: string): string => {
          const idx = colIndex[key];
          return idx !== undefined ? String(row[idx] ?? '').trim() : '';
        };

        const tx: WeChatTransaction = {
          transactionDate: formatDate(getVal('transactionDate')),
          type: getVal('type'),
          counterparty: getVal('counterparty'),
          description: getVal('description'),
          amount,
          incomeExpense: '收入',
          paymentMethod: getVal('paymentMethod'),
          status: getVal('status'),
          orderId: getVal('orderId'),
          merchantOrderId: getVal('merchantOrderId'),
          note: getVal('note'),
        };

        result.transactions.push(tx);
        result.parsedRows++;
      } catch {
        result.errors.push(`跳过第 ${i + 1} 行`);
      }
    }

    result.success = result.parsedRows > 0;
  } catch (err) {
    result.errors.push(`文件读取失败: ${err instanceof Error ? err.message : '未知错误'}`);
  }

  return result;
}
