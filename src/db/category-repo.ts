import { type SQLiteDatabase } from 'expo-sqlite';
import { type Category } from '@/types/transaction';

export function createCategoryRepo(db: SQLiteDatabase) {
  return {
    async getAll(): Promise<Category[]> {
      return await db.getAllAsync<Category>(
        'SELECT * FROM categories ORDER BY sort_order ASC'
      );
    },

    async getIncomeCategories(): Promise<Category[]> {
      return await db.getAllAsync<Category>(
        "SELECT * FROM categories WHERE type = 'income' ORDER BY sort_order ASC"
      );
    },

    async getById(id: number): Promise<Category | null> {
      const result = await db.getAllAsync<Category>(
        'SELECT * FROM categories WHERE id = ?',
        id
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
      const result = await db.runAsync(
        `INSERT INTO categories (name, type, source, icon, color, sort_order, is_system, channel)
         VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories), 0, ?)`,
        category.name,
        category.type,
        category.source,
        category.icon ?? null,
        category.color ?? null,
        category.channel ?? 'online'
      );
      return result.lastInsertRowId;
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
      params.push(id);

      await db.runAsync(
        `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
        ...params
      );
    },

    async delete(id: number): Promise<void> {
      const cat = await this.getById(id);
      if (cat?.is_system) {
        throw new Error('不能删除系统预置分类');
      }
      await db.runAsync('DELETE FROM categories WHERE id = ? AND is_system = 0', id);
    },
  };
}

export type CategoryRepo = ReturnType<typeof createCategoryRepo>;
