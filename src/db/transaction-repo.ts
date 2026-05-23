import { type SQLiteDatabase } from 'expo-sqlite';
import { type InsertTransaction, type TransactionWithCategory } from '@/types/transaction';

export function createTransactionRepo(db: SQLiteDatabase) {
  return {
    async insert(tx: InsertTransaction): Promise<number> {
      const result = await db.runAsync(
        `INSERT INTO transactions (amount, type, category_id, source, date, note, order_id, wechat_raw)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        tx.amount,
        tx.type,
        tx.category_id,
        tx.source,
        tx.date,
        tx.note ?? null,
        tx.order_id ?? null,
        tx.wechat_raw ?? null
      );
      return result.lastInsertRowId;
    },

    async bulkInsert(transactions: InsertTransaction[]): Promise<number> {
      let count = 0;
      for (const tx of transactions) {
        try {
          await this.insert(tx);
          count++;
        } catch {
          // skip duplicate order_id
        }
      }
      return count;
    },

    async getAll(filters?: {
      dateFrom?: string;
      dateTo?: string;
      categoryId?: number;
      source?: string;
      searchQuery?: string;
      limit?: number;
      offset?: number;
    }): Promise<TransactionWithCategory[]> {
      let sql = `
        SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.type = 'income'
      `;
      const params: any[] = [];

      if (filters?.dateFrom) {
        sql += ' AND t.date >= ?';
        params.push(filters.dateFrom);
      }
      if (filters?.dateTo) {
        sql += ' AND t.date <= ?';
        params.push(filters.dateTo);
      }
      if (filters?.categoryId) {
        sql += ' AND t.category_id = ?';
        params.push(filters.categoryId);
      }
      if (filters?.source) {
        sql += ' AND t.source = ?';
        params.push(filters.source);
      }
      if (filters?.searchQuery) {
        sql += ' AND (t.note LIKE ? OR c.name LIKE ?)';
        params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
      }

      sql += ' ORDER BY t.date DESC, t.id DESC';

      if (filters?.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }
      if (filters?.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }

      return await db.getAllAsync(sql, params);
    },

    async getRecent(limit: number = 5): Promise<TransactionWithCategory[]> {
      return await db.getAllAsync(
        `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.type = 'income'
         ORDER BY t.date DESC, t.id DESC
         LIMIT ?`,
        limit
      );
    },

    async getById(id: number): Promise<TransactionWithCategory | null> {
      const result = await db.getAllAsync<TransactionWithCategory>(
        `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.id = ?`,
        id
      );
      return result[0] ?? null;
    },

    async getExistingOrderIds(): Promise<Set<string>> {
      const rows = await db.getAllAsync<{ order_id: string }>(
        `SELECT order_id FROM transactions WHERE order_id IS NOT NULL`
      );
      return new Set(rows.map(r => r.order_id));
    },

    async update(id: number, tx: Partial<InsertTransaction>): Promise<void> {
      const fields: string[] = [];
      const params: any[] = [];

      if (tx.amount !== undefined) { fields.push('amount = ?'); params.push(tx.amount); }
      if (tx.category_id !== undefined) { fields.push('category_id = ?'); params.push(tx.category_id); }
      if (tx.date !== undefined) { fields.push('date = ?'); params.push(tx.date); }
      if (tx.note !== undefined) { fields.push('note = ?'); params.push(tx.note); }

      if (fields.length === 0) return;

      fields.push("updated_at = datetime('now', 'localtime')");
      params.push(id);

      await db.runAsync(
        `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
        ...params
      );
    },

    async delete(id: number): Promise<void> {
      await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
    },

    async count(): Promise<number> {
      const result = await db.getAllAsync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM transactions WHERE type = 'income'`
      );
      return result[0]?.cnt ?? 0;
    },

    async getDateRange(): Promise<{ min: string; max: string } | null> {
      const result = await db.getAllAsync<{ min: string; max: string }>(
        `SELECT MIN(date) as min, MAX(date) as max FROM transactions WHERE type = 'income'`
      );
      return result[0]?.min ? result[0] : null;
    },
  };
}

export type TransactionRepo = ReturnType<typeof createTransactionRepo>;
