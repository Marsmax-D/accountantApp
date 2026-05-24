// Supabase Realtime 订阅
// 订阅 sync_journal 表的变更，收到通知后自动拉取云端数据

import { supabase } from '@/supabase/client';
import { pullChanges } from './sync-engine';
import { type SQLiteDatabase } from 'expo-sqlite';

let channel: ReturnType<typeof supabase.channel> | null = null;

export function subscribeToChanges(
  db: SQLiteDatabase,
  familyId: string,
  onDataChanged: () => void
): void {
  if (channel) {
    unsubscribeFromChanges();
  }

  channel = supabase
    .channel(`family-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sync_journal',
        filter: `family_id=eq.${familyId}`,
      },
      async (payload) => {
        // Filter out own changes
        const changedBy = (payload.new as any)?.changed_by;
        // We can't easily check against local user_id in this scope,
        // but pullChanges already filters by changed_by != local user
        try {
          await pullChanges(db);
          onDataChanged();
        } catch (err) {
          console.error('Realtime pull failed:', err);
        }
      }
    )
    .subscribe();
}

export function unsubscribeFromChanges(): void {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}
