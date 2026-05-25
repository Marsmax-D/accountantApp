import { type SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  const statements = SCHEMA_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await db.runAsync(statement + ';');
  }

  // Migrations for existing databases
  await migrateV1(db);
  await migrateV2(db);
  await migrateV3(db);
}

async function migrateV1(db: SQLiteDatabase): Promise<void> {
  // Add channel column to categories (v1 migration)
  try {
    await db.runAsync("ALTER TABLE categories ADD COLUMN channel TEXT NOT NULL DEFAULT 'online'");
  } catch {
    // Column already exists, skip
  }
  // Always ensure 现金收入 (id=6) is offline, regardless of whether ALTER TABLE succeeded
  await db.runAsync("UPDATE categories SET channel = 'offline' WHERE id = 6 AND channel != 'offline'");
}

async function migrateV2(db: SQLiteDatabase): Promise<void> {
  // Add family sync columns to transactions
  const txCols = [
    "ALTER TABLE transactions ADD COLUMN remote_id TEXT",
    "ALTER TABLE transactions ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('synced','pending','conflict'))",
    "ALTER TABLE transactions ADD COLUMN created_by TEXT",
    "ALTER TABLE transactions ADD COLUMN deleted_at TEXT",
  ];
  for (const sql of txCols) {
    try { await db.runAsync(sql); } catch { /* column exists, skip */ }
  }

  // Add family sync columns to categories
  const catCols = [
    "ALTER TABLE categories ADD COLUMN remote_id TEXT",
    "ALTER TABLE categories ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('synced','pending','conflict'))",
    "ALTER TABLE categories ADD COLUMN deleted_at TEXT",
  ];
  for (const sql of catCols) {
    try { await db.runAsync(sql); } catch { /* column exists, skip */ }
  }

  // Create new tables for sync
  const newTables = [
    `CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sync_operations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT    NOT NULL CHECK(table_name IN ('categories','transactions')),
      local_id   INTEGER NOT NULL,
      remote_id  TEXT,
      operation  TEXT    NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
      payload    TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    )`,
  ];
  for (const sql of newTables) {
    await db.runAsync(sql);
  }
}

async function migrateV3(db: SQLiteDatabase): Promise<void> {
  // 统一收入类型为绿色(#4CAF50)，支出类型为红色(#F44336)
  for (const id of [1,2,3,4,5,6,7,8]) {
    try { await db.runAsync(`UPDATE categories SET color = '#4CAF50' WHERE id = ${id} AND color != '#4CAF50'`); } catch {}
  }
  for (const id of [9,10,11,12,13,14,15,16]) {
    try { await db.runAsync(`UPDATE categories SET color = '#F44336' WHERE id = ${id} AND color != '#F44336'`); } catch {}
  }
}
