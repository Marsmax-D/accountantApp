export interface WeChatTransaction {
  transactionDate: string;
  type: string;
  counterparty: string;
  description: string;
  amount: number;
  incomeExpense: '收入' | '支出';
  paymentMethod: string;
  status: string;
  orderId: string;
  merchantOrderId: string;
  note: string;
}

export interface CsvParseResult {
  success: boolean;
  transactions: WeChatTransaction[];
  errors: string[];
  totalRows: number;
  parsedRows: number;
}

export interface DedupResult {
  newTransactions: WeChatTransaction[];
  duplicates: number;
}
