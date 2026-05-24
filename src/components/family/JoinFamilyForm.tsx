import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface Props {
  onSubmit: (inviteCode: string, nickname: string) => Promise<void>;
  loading: boolean;
}

export function JoinFamilyForm({ onSubmit, loading }: Props) {
  const [inviteCode, setInviteCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!inviteCode.trim() || !nickname.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(inviteCode.trim(), nickname.trim());
      setInviteCode('');
      setNickname('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText style={styles.cardTitle}>加入家庭</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.description}>
        输入朋友分享的6位数字邀请码
      </ThemedText>

      <View style={styles.field}>
        <ThemedText style={styles.label}>邀请码</ThemedText>
        <TextInput
          style={[styles.input, styles.codeInput]}
          value={inviteCode}
          onChangeText={(t) => setInviteCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder="6位数字"
          placeholderTextColor="#9E9E9E"
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>你的昵称</ThemedText>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="例如：小红"
          placeholderTextColor="#9E9E9E"
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: '#2196F3' },
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleSubmit}
        disabled={submitting || loading || inviteCode.length !== 6}
      >
        <ThemedText style={styles.buttonText}>
          {submitting ? '加入中...' : '加入家庭'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212121',
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
