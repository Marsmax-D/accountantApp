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
}

async function migrateV1(db: SQLiteDatabase): Promise<void> {
  // Add channel column to categories (v1 migration)
  try {
    await db.runAsync("ALTER TABLE categories ADD COLUMN channel TEXT NOT NULL DEFAULT 'online'");
    // Set 现金收入 (id=6) to offline
    await db.runAsync("UPDATE categories SET channel = 'offline' WHERE id = 6");
  } catch {
    // Column already exists, skip
  }
}
