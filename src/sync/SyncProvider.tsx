import { useEffect, useRef } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { pushChanges, pullChanges } from './sync-engine';
import { subscribeToChanges, unsubscribeFromChanges } from './realtime';
import { useFamilyStore } from '@/store/use-family-store';

/**
 * 全局同步 Provider — 放在 _layout.tsx 根节点
 * 当用户已加入家庭时：
 *   - 每 20 秒自动推送本地变更 + 拉取云端变更（双端数据始终保持一致）
 *   - 订阅 Supabase Realtime，收到变更后自动拉取
 *   - 同步完成后递增 syncVersion，通知各页面刷新
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const familyId = useFamilyStore((s) => s.familyId);
  const setLastSync = useFamilyStore((s) => s.setLastSync);
  const setPendingCount = useFamilyStore((s) => s.setPendingCount);
  const incrementSyncVersion = useFamilyStore((s) => s.incrementSyncVersion);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 全局自动推送 interval（独立于 family tab 是否挂载）
  useEffect(() => {
    if (!familyId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(async () => {
      try {
        // 先推送本地变更到云端
        const pushResult = await pushChanges(db);
        if (pushResult.pushed > 0) {
          setPendingCount(0);
        }
        // 再拉取云端变更到本地（即使没有推送，也要检查是否有其他成员的变更）
        const pullResult = await pullChanges(db);
        if (pushResult.pushed > 0 || pullResult.pulled > 0) {
          setLastSync(new Date().toISOString());
          incrementSyncVersion();
        }
      } catch {
        // 静默失败
      }
    }, 20000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [db, familyId, setLastSync, setPendingCount, incrementSyncVersion]);

  // Realtime 订阅：收到云端变更后自动拉取并通知 UI
  useEffect(() => {
    if (!familyId) return;

    subscribeToChanges(db, familyId, () => {
      setLastSync(new Date().toISOString());
      incrementSyncVersion(); // 通知各页面重新查询数据
    });

    return () => unsubscribeFromChanges();
  }, [db, familyId, setLastSync, incrementSyncVersion]);

  return <>{children}</>;
}
