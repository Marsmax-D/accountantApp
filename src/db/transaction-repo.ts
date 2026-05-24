import { type SQLiteDatabase } from 'expo-sqlite';
import { type InsertTransaction, type TransactionWithCategory } from '@/types/transaction';

export interface SyncContext {
  familyId: string;
  userId: string;
}

export function createTransactionRepo(db: SQLiteDatabase, sync?: SyncContext) {
  function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async function recordSyncOp(
    tableName: string,
    localId: number,
    remoteId: string | null,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: Record<string, unknown>
  ): Promise<void> {
    if (!sync) return;
    await db.runAsync(
      `INSERT INTO sync_operations (table_name, local_id, remote_id, operation, payload)
       VALUES (?, ?, ?, ?, ?)`,
      tableName, localId, remoteId, operation, JSON.stringify(payload)
    );
  }

  return {
    async insert(tx: InsertTransaction): Promise<number> {
      const remoteId = sync ? generateUUID() : null;
      const result = await db.runAsync(
        `INSERT INTO transactions (amount, type, category_id, source, date, note, order_id, wechat_raw, remote_id, sync_status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        tx.amount,
        tx.type,
        tx.category_id,
        tx.source,
        tx.date,
        tx.note ?? null,
        tx.order_id ?? null,
        tx.wechat_raw ?? null,
        remoteId,
        sync ? 'pending' : 'synced',
        sync?.userId ?? null
      );
      const localId = result.lastInsertRowId;
      if (sync && remoteId) {
        const payload: Record<string, unknown> = {
          amount: tx.amount, type: tx.type, category_id: tx.category_id,
          source: tx.source, date: tx.date, note: tx.note ?? null,
          order_id: tx.order_id ?? null, wechat_raw: tx.wechat_raw ?? null,
          remote_id: remoteId, created_by: sync.userId,
        };
        await recordSyncOp('transactions', localId, remoteId, 'INSERT', payload);
      }
      return localId;
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
        WHERE t.type = 'income' AND t.deleted_at IS NULL
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
         WHERE t.type = 'income' AND t.deleted_at IS NULL
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
         WHERE t.id = ? AND t.deleted_at IS NULL`,
        id
      );
      return result[0] ?? null;
    },

    async getByRemoteId(remoteId: string): Promise<TransactionWithCategory | null> {
      const result = await db.getAllAsync<TransactionWithCategory>(
        `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.remote_id = ?`,
        remoteId
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

      if (sync) {
        fields.push("sync_status = 'pending'");
      }
      fields.push("updated_at = datetime('now', 'localtime')");
      params.push(id);

      await db.runAsync(
        `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
        ...params
      );

      if (sync) {
        // Get the current record for payload
        const record = await this.getById(id);
        if (record) {
          const { category_name, category_color, category_icon, ...payload } = record as any;
          await recordSyncOp('transactions', id, record.remote_id, 'UPDATE', payload as Record<string, unknown>);
        }
      }
    },

    async delete(id: number): Promise<void> {
      // Soft delete — set deleted_at instead of hard DELETE
      const rows = await db.getAllAsync<{ remote_id: string }>(
        'SELECT remote_id FROM transactions WHERE id = ?', id
      );
      const remoteId = rows[0]?.remote_id || null;

      await db.runAsync(
        "UPDATE transactions SET deleted_at = datetime('now', 'localtime'), sync_status = ? WHERE id = ?",
        sync ? 'pending' : 'synced', id
      );

      if (sync) {
        await recordSyncOp('transactions', id, remoteId, 'DELETE', { id });
      }
    },

    async count(): Promise<number> {
      const result = await db.getAllAsync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM transactions WHERE type = 'income' AND deleted_at IS NULL`
      );
      return result[0]?.cnt ?? 0;
    },

    async getDateRange(): Promise<{ min: string; max: string } | null> {
      const result = await db.getAllAsync<{ min: string; max: string }>(
        `SELECT MIN(date) as min, MAX(date) as max FROM transactions WHERE type = 'income' AND deleted_at IS NULL`
      );
      return result[0]?.min ? result[0] : null;
    },

    async getPendingSync(): Promise<TransactionWithCategory[]> {
      return await db.getAllAsync(
        `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.sync_status = 'pending'`
      );
    },

    async upsertFromRemote(record: {
      remote_id: string;
      amount: number;
      type: string;
      category_id: number;
      source: string;
      date: string;
      note: string | null;
      order_id: string | null;
      wechat_raw: string | null;
      created_by: string;
      updated_at: string;
      deleted_at: string | null;
    }): Promise<void> {
      const existing = await this.getByRemoteId(record.remote_id);
      if (existing) {
        // Update if remote is newer
        if (record.deleted_at) {
          await db.runAsync(
            "UPDATE transactions SET deleted_at = ?, sync_status = 'synced' WHERE remote_id = ?",
            record.deleted_at, record.remote_id
          );
        } else {
          await db.runAsync(
            `UPDATE transactions SET amount = ?, category_id = ?, source = ?, date = ?,
               note = ?, order_id = ?, wechat_raw = ?, sync_status = 'synced'
             WHERE remote_id = ?`,
            record.amount, record.category_id, record.source, record.date,
            record.note, record.order_id, record.wechat_raw, record.remote_id
          );
        }
      } else if (!record.deleted_at) {
        await db.runAsync(
          `INSERT INTO transactions (amount, type, category_id, source, date, note, order_id, wechat_raw, remote_id, sync_status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          record.amount, record.type, record.category_id, record.source,
          record.date, record.note, record.order_id, record.wechat_raw,
          record.remote_id, record.created_by
        );
      }
    },

    async markSynced(ids: number[]): Promise<void> {
      if (ids.length === 0) return;
      const placeholders = ids.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE transactions SET sync_status = 'synced' WHERE id IN (${placeholders})`,
        ...ids
      );
    },
  };
}

export type TransactionRepo = ReturnType<typeof createTransactionRepo>;
