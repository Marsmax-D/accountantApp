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
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 家庭信息卡片 */}
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText style={styles.familyName}>{familyName}</ThemedText>

        <View style={styles.inviteRow}>
          <View style={styles.inviteInfo}>
            <ThemedText themeColor="textSecondary" style={styles.inviteLabel}>邀请码</ThemedText>
            <ThemedText style={styles.inviteCode}>{inviteCode}</ThemedText>
          </View>
          <Pressable style={styles.shareBtn} onPress={handleShareCode}>
            <ThemedText style={styles.shareBtnText}>分享</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      {/* 成员列表卡片 */}
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText style={styles.sectionTitle}>成员 ({members.length})</ThemedText>
        {members.map((m) => (
          <View key={m.user_id} style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <View style={[styles.avatar, { backgroundColor: m.role === 'owner' ? '#4CAF50' : '#90A4AE' }]}>
                <ThemedText style={styles.avatarText}>
                  {m.nickname.slice(0, 1).toUpperCase()}
                </ThemedText>
              </View>
              <View>
                <View style={styles.nameRow}>
                  <ThemedText style={styles.memberName}>{m.nickname}</ThemedText>
                  <View style={[styles.roleBadge, { backgroundColor: m.role === 'owner' ? '#E8F5E9' : '#ECEFF1' }]}>
                    <ThemedText style={[styles.roleText, { color: m.role === 'owner' ? '#2E7D32' : '#607D8B' }]}>
                      {ROLE_LABELS[m.role]}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText themeColor="textSecondary" style={styles.joinDate}>
                  加入于 {m.joined_at?.slice(0, 10) || '-'}
                </ThemedText>
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

      {/* 同步状态 */}
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText style={styles.sectionTitle}>同步</ThemedText>
        <View style={styles.syncRow}>
          <ThemedText themeColor="textSecondary">
            {lastSyncAt ? `上次同步: ${new Date(lastSyncAt).toLocaleTimeString('zh-CN')}` : '未同步'}
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.syncBtn,
              { backgroundColor: '#2196F3' },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleSync}
            disabled={syncing}
          >
            <ThemedText style={styles.syncBtnText}>{syncing ? '同步中...' : '立即同步'}</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      {/* 退出按钮 */}
      <Pressable
        style={({ pressed }) => [
          styles.leaveBtn,
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleLeave}
      >
        <ThemedText style={styles.leaveBtnText}>
          {role === 'owner' ? '解散家庭' : '退出家庭'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  card: {
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  familyName: {
    fontSize: 22,
    fontWeight: '700',
  },
  inviteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
  },
  inviteInfo: { gap: 2 },
  inviteLabel: { fontSize: 12 },
  inviteCode: { fontSize: 28, fontWeight: '800', letterSpacing: 6 },
  shareBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 15, fontWeight: '600' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  roleText: { fontSize: 11, fontWeight: '600' },
  joinDate: { fontSize: 12, marginTop: 2 },
  removeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 6, backgroundColor: '#FFEBEE',
  },
  removeBtnText: { color: '#C62828', fontSize: 13, fontWeight: '600' },
  syncRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  syncBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  syncBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  leaveBtn: {
    alignItems: 'center', paddingVertical: 14,
    borderRadius: 12, backgroundColor: '#FFEBEE',
  },
  leaveBtnText: { color: '#C62828', fontWeight: '600', fontSize: 15 },
});
