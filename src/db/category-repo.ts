import { type SQLiteDatabase } from 'expo-sqlite';
import { type Category } from '@/types/transaction';

export interface SyncContext {
  familyId: string;
  userId: string;
}

export function createCategoryRepo(db: SQLiteDatabase, sync?: SyncContext) {
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
    async getAll(): Promise<Category[]> {
      return await db.getAllAsync<Category>(
        'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY sort_order ASC'
      );
    },

    async getIncomeCategories(): Promise<Category[]> {
      return await db.getAllAsync<Category>(
        "SELECT * FROM categories WHERE type = 'income' AND deleted_at IS NULL ORDER BY sort_order ASC"
      );
    },

    async getExpenseCategories(): Promise<Category[]> {
      return await db.getAllAsync<Category>(
        "SELECT * FROM categories WHERE type = 'expense' AND deleted_at IS NULL ORDER BY sort_order ASC"
      );
    },

    async getById(id: number): Promise<Category | null> {
      const result = await db.getAllAsync<Category>(
        'SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL',
        id
      );
      return result[0] ?? null;
    },

    async getByRemoteId(remoteId: string): Promise<Category | null> {
      const result = await db.getAllAsync<Category>(
        'SELECT * FROM categories WHERE remote_id = ?',
        remoteId
      );
      return result[0] ?? null;
    },

    async insert(category: {
      name: string;
      type: 'income' | 'expense';
      source: 'wechat' | 'manual' | 'both';
      icon?: string;
      color?: string;
      channel?: 'online' | 'offline';
    }): Promise<number> {
      const remoteId = sync ? generateUUID() : null;
      const result = await db.runAsync(
        `INSERT INTO categories (name, type, source, icon, color, sort_order, is_system, channel, remote_id, sync_status)
         VALUES (?, ?, ?, ?, ?,
           (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories),
           0, ?, ?, ?)`,
        category.name,
        category.type,
        category.source,
        category.icon ?? null,
        category.color ?? null,
        category.channel ?? 'online',
        remoteId,
        sync ? 'pending' : 'synced'
      );
      const localId = result.lastInsertRowId;
      if (sync && remoteId) {
        await recordSyncOp('categories', localId, remoteId, 'INSERT', {
          ...category, remote_id: remoteId, is_system: 0, created_by: sync.userId,
        });
      }
      return localId;
    },

    async update(id: number, updates: {
      name?: string;
      icon?: string;
      color?: string;
      source?: 'wechat' | 'manual' | 'both';
      channel?: 'online' | 'offline';
    }): Promise<void> {
      const fields: string[] = [];
      const params: any[] = [];

      if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
      if (updates.icon !== undefined) { fields.push('icon = ?'); params.push(updates.icon); }
      if (updates.color !== undefined) { fields.push('color = ?'); params.push(updates.color); }
      if (updates.source !== undefined) { fields.push('source = ?'); params.push(updates.source); }
      if (updates.channel !== undefined) { fields.push('channel = ?'); params.push(updates.channel); }

      if (fields.length === 0) return;

      if (sync) {
        fields.push("sync_status = 'pending'");
      }
      params.push(id);

      await db.runAsync(
        `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
        ...params
      );

      if (sync) {
        const cat = await this.getById(id);
        if (cat) {
          const { created_at: _c, ...payload } = cat;
          await recordSyncOp('categories', id, cat.remote_id ?? null, 'UPDATE', payload as Record<string, unknown>);
        }
      }
    },

    async delete(id: number): Promise<void> {
      const cat = await this.getById(id);
      if (cat?.is_system) {
        throw new Error('不能删除系统预置分类');
      }
      // Soft delete for sync compatibility
      await db.runAsync(
        "UPDATE categories SET deleted_at = datetime('now', 'localtime'), sync_status = ? WHERE id = ? AND is_system = 0",
        sync ? 'pending' : 'synced', id
      );

      if (sync && cat) {
        await recordSyncOp('categories', id, cat.remote_id ?? null, 'DELETE', { id, name: cat.name });
      }
    },

    async upsertFromRemote(record: {
      remote_id: string;
      name: string;
      type: string;
      source: string;
      icon: string | null;
      color: string | null;
      sort_order: number;
      is_system: number;
      channel: string;
      created_by: string;
      updated_at: string;
      deleted_at: string | null;
    }): Promise<void> {
      const existing = await this.getByRemoteId(record.remote_id);
      if (existing) {
        if (record.deleted_at) {
          await db.runAsync(
            "UPDATE categories SET deleted_at = ?, sync_status = 'synced' WHERE remote_id = ?",
            record.deleted_at, record.remote_id
          );
        } else {
          await db.runAsync(
            `UPDATE categories SET name = ?, source = ?, icon = ?, color = ?,
               channel = ?, sync_status = 'synced'
             WHERE remote_id = ?`,
            record.name, record.source, record.icon, record.color,
            record.channel, record.remote_id
          );
        }
      } else if (!record.deleted_at) {
        await db.runAsync(
          `INSERT INTO categories (name, type, source, icon, color, sort_order, is_system, channel, remote_id, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          record.name, record.type, record.source, record.icon, record.color,
          record.sort_order, record.is_system, record.channel, record.remote_id
        );
      }
    },

    async markSynced(ids: number[]): Promise<void> {
      if (ids.length === 0) return;
      const placeholders = ids.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE categories SET sync_status = 'synced' WHERE id IN (${placeholders})`,
        ...ids
      );
    },
  };
}

export type CategoryRepo = ReturnType<typeof createCategoryRepo>;
