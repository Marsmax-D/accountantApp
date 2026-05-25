import { useState } from 'react';
import { StyleSheet, Pressable, View, Share, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFamilyStore } from '@/store/use-family-store';

interface Member {
  user_id: string;
  nickname: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

interface Props {
  familyName: string;
  inviteCode: string;
  role: 'owner' | 'admin' | 'member';
  members: Member[];
  onSync: () => Promise<void>;
  onLeave: () => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}

const ROLE_LABELS: Record<string, string> = {
  owner: '创建者',
  admin: '管理员',
  member: '成员',
};

export function FamilyDetails({
  familyName, inviteCode, role, members, onSync, onLeave, onRemoveMember,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const { lastSyncAt } = useFamilyStore();

  const handleShareCode = () => {
    Share.share({ message: `邀请你加入「${familyName}」家庭账本，邀请码：${inviteCode}` });
  };

  const handleLeave = () => {
    Alert.alert('退出家庭', '退出后将不再同步该家庭的数据。本地数据将保留。', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: onLeave },
    ]);
  };

  const handleRemove = (userId: string, nick: string) => {
    Alert.alert('移除成员', `确定要移除「${nick}」吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '移除', style: 'destructive', onPress: () => onRemoveMember(userId) },
    ]);
  };

  const handleSync = async () => {
    setSyncing(true);
    try { await onSync(); } finally { setSyncing(false); }
  };

  return (
    <View style={styles.container}>
      {/* 家庭信息卡片 */}
      <ThemedView style={styles.card}>
        <View style={styles.familyHeader}>
          <ThemedText style={styles.familyIcon}>👨‍👩‍👧‍👦</ThemedText>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.familyName}>{familyName}</ThemedText>
            <ThemedText style={styles.familyRole}>{ROLE_LABELS[role]}</ThemedText>
          </View>
        </View>

        <View style={styles.inviteRow}>
          <View style={styles.inviteInfo}>
            <ThemedText style={styles.inviteLabel}>邀请码</ThemedText>
            <ThemedText style={styles.inviteCode}>{inviteCode}</ThemedText>
          </View>
          <Pressable style={styles.shareBtn} onPress={handleShareCode}>
            <ThemedText style={styles.shareBtnText}>分享</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      {/* 成员列表 */}
      <ThemedView style={styles.card}>
        <ThemedText style={styles.sectionTitle}>成员 ({members.length})</ThemedText>
        {members.slice(0, 4).map((m) => (
          <View key={m.user_id} style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <View style={[styles.avatar, { backgroundColor: m.role === 'owner' ? '#4CAF50' : '#90A4AE' }]}>
                <ThemedText style={styles.avatarText}>
                  {m.nickname.slice(0, 1).toUpperCase()}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <ThemedText style={styles.memberName} numberOfLines={1}>{m.nickname}</ThemedText>
                  <View style={[styles.roleBadge, { backgroundColor: m.role === 'owner' ? '#E8F5E9' : '#ECEFF1' }]}>
                    <ThemedText style={[styles.roleText, { color: m.role === 'owner' ? '#2E7D32' : '#607D8B' }]}>
                      {ROLE_LABELS[m.role]}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
            {role === 'owner' && m.role !== 'owner' && (
              <Pressable style={styles.removeBtn} onPress={() => handleRemove(m.user_id, m.nickname)}>
                <ThemedText style={styles.removeBtnText}>移除</ThemedText>
              </Pressable>
            )}
          </View>
        ))}
      </ThemedView>

      {/* 同步 + 退出 */}
      <View style={styles.actionRow}>
        <View style={styles.syncInfo}>
          <ThemedText style={styles.syncDot} />
          <ThemedText style={styles.syncText}>
            {lastSyncAt ? `上次同步: ${new Date(lastSyncAt).toLocaleTimeString('zh-CN')}` : '未同步'}
          </ThemedText>
        </View>
        <View style={styles.actionBtns}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.syncBtn, pressed && { opacity: 0.7 }]}
            onPress={handleSync}
            disabled={syncing}
          >
            <ThemedText style={styles.syncBtnText}>{syncing ? '同步中' : '同步'}</ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.leaveBtn, pressed && { opacity: 0.7 }]}
            onPress={handleLeave}
          >
            <ThemedText style={styles.leaveBtnText}>{role === 'owner' ? '解散' : '退出'}</ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12 },
  card: {
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  familyIcon: { fontSize: 28 },
  familyName: {
    fontSize: 20,
    fontWeight: '700',
  },
  familyRole: {
    fontSize: 12,
    opacity: 0.4,
    marginTop: 1,
  },
  inviteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
  },
  inviteInfo: { gap: 2 },
  inviteLabel: { fontSize: 11, opacity: 0.5 },
  inviteCode: { fontSize: 26, fontWeight: '800', letterSpacing: 6 },
  shareBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14, fontWeight: '600' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleText: { fontSize: 10, fontWeight: '600' },
  removeBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, backgroundColor: '#FFEBEE',
  },
  removeBtnText: { color: '#C62828', fontSize: 12, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  syncText: {
    fontSize: 12,
    opacity: 0.4,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncBtn: {
    backgroundColor: '#f0fdf4',
  },
  syncBtnText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 13,
  },
  leaveBtn: {
    backgroundColor: '#fef2f2',
  },
  leaveBtnText: {
    color: '#C62828',
    fontWeight: '600',
    fontSize: 13,
  },
});
