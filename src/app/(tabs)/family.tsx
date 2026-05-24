import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFamilyStore } from '@/store/use-family-store';
import { generateUUID } from '@/utils/uuid';
import {
  readSyncMeta, writeSyncMeta, pushChanges, pullChanges,
  createFamily, joinFamily, leaveFamily, getFamilyMembers, removeMember,
} from '@/sync/sync-engine';
import { CreateFamilyForm } from '@/components/family/CreateFamilyForm';
import { JoinFamilyForm } from '@/components/family/JoinFamilyForm';
import { FamilyDetails } from '@/components/family/FamilyDetails';

export default function FamilyScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    userId, nickname, familyId, familyName, inviteCode, role, members,
    setUser, setFamily, setMembers, leaveFamily: clearStore,
    setLastSync, setPendingCount,
  } = useFamilyStore();

  // Initialize user identity
  useEffect(() => {
    (async () => {
      try {
        const meta = await readSyncMeta(db);
        if (meta.userId) {
          setUser(meta.userId, meta.nickname || '未命名');
          if (meta.familyId) {
            setFamily(meta.familyId, meta.familyName || '', meta.inviteCode || '', (meta.role as any) || 'member');
          }
        } else {
          // First launch — generate user identity
          const newUserId = generateUUID();
          await writeSyncMeta(db, { user_id: newUserId, nickname: '' });
          setUser(newUserId, '');
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load family members
  useFocusEffect(
    useCallback(() => {
      if (!familyId) return;
      (async () => {
        try {
          const list = await getFamilyMembers(familyId);
          setMembers(list);
        } catch { /* ignore */ }
      })();
    }, [familyId])
  );

  // 监听全局同步版本号，云端有变更时重新加载成员列表
  const syncVersion = useFamilyStore((s) => s.syncVersion);
  useEffect(() => {
    if (!familyId) return;
    getFamilyMembers(familyId).then(setMembers).catch(() => {});
  }, [syncVersion, familyId]);

  const handleCreateFamily = async (name: string, nick: string) => {
    setError(null);
    try {
      if (!userId) {
        // Generate user ID if not set
        const newUserId = generateUUID();
        await writeSyncMeta(db, { user_id: newUserId, nickname: nick });
        setUser(newUserId, nick);
      }
      const effectiveUserId = userId || generateUUID();
      const { familyId: fid, inviteCode } = await createFamily(db, name, nick, effectiveUserId);
      setUser(effectiveUserId, nick);
      setFamily(fid, name, inviteCode, 'owner');
      const list = await getFamilyMembers(fid);
      setMembers(list);
      setLastSync(new Date().toISOString());
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleJoinFamily = async (code: string, nick: string) => {
    setError(null);
    try {
      const effectiveUserId = userId || generateUUID();
      if (!userId) {
        await writeSyncMeta(db, { user_id: effectiveUserId, nickname: nick });
        setUser(effectiveUserId, nick);
      }
      const { familyId: fid, familyName: fname } = await joinFamily(db, code, nick, effectiveUserId);
      setUser(effectiveUserId, nick);
      setFamily(fid, fname, code, 'member');
      const list = await getFamilyMembers(fid);
      setMembers(list);
      setLastSync(new Date().toISOString());
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveFamily(db);
      clearStore();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      if (!familyId) return;
      await removeMember(familyId, memberId);
      setMembers(members.filter(m => m.user_id !== memberId));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSync = async () => {
    setError(null);
    try {
      const pushResult = await pushChanges(db);
      const pullResult = await pullChanges(db);
      setPendingCount(0);
      setLastSync(new Date().toISOString());
      if (pushResult.errors.length > 0) {
        setError(pushResult.errors.join(', '));
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await handleSync();
    if (familyId) {
      try {
        const list = await getFamilyMembers(familyId);
        setMembers(list);
      } catch { /* ignore */ }
    }
    setRefreshing(false);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText style={styles.pageTitle}>家庭</ThemedText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error && (
          <ThemedView style={[styles.errorCard, { backgroundColor: '#FFEBEE' }]}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </ThemedView>
        )}

        {!familyId ? (
          <View style={styles.content}>
            <CreateFamilyForm onSubmit={handleCreateFamily} loading={loading} />
            <View style={styles.divider}>
              <ThemedText themeColor="textSecondary">或者</ThemedText>
            </View>
            <JoinFamilyForm onSubmit={handleJoinFamily} loading={loading} />
          </View>
        ) : (
          <View style={styles.content}>
            <FamilyDetails
              familyName={familyName!}
              inviteCode={inviteCode!}
              role={role!}
              members={members}
              onSync={handleSync}
              onLeave={handleLeave}
              onRemoveMember={handleRemoveMember}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 4 },
  pageTitle: { fontSize: 28, fontWeight: '700', lineHeight: 40 },
  content: { padding: 16, gap: 20 },
  divider: { alignItems: 'center', paddingVertical: 8 },
  errorCard: { padding: 12, borderRadius: 10, marginHorizontal: 16, marginTop: 8 },
  errorText: { color: '#C62828', fontSize: 14 },
});
