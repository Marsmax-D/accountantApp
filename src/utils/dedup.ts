import { type WeChatTransaction, type DedupResult } from '@/types/csv';

export function deduplicate(
  parsed: WeChatTransaction[],
  existingOrderIds: Set<string>
): DedupResult {
  const newTransactions: WeChatTransaction[] = [];
  let duplicates = 0;

  for (const tx of parsed) {
    // Skip transactions without order ID
    if (!tx.orderId) continue;

    if (existingOrderIds.has(tx.orderId)) {
      duplicates++;
      continue;
    }

    newTransactions.push(tx);
  }

  return {
    newTransactions,
    duplicates,
  };
}

export function categorizeWeChatTransaction(tx: WeChatTransaction): number {
  const type = tx.type || '';
  const counterparty = tx.counterparty || '';

  if (type.includes('红包')) return 4; // 微信红包
  if (type.includes('转账')) return 3; // 微信转账
  if (type.includes('商户') || type.includes('收款') || counterparty.includes('商户')) return 5; // 微信商户收款

  return 8; // 其他收入
}
