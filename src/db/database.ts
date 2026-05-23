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
}
