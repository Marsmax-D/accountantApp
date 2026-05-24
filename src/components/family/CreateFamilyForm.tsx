import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface Props {
  onSubmit: (familyName: string, nickname: string) => Promise<void>;
  loading: boolean;
}

export function CreateFamilyForm({ onSubmit, loading }: Props) {
  const [familyName, setFamilyName] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!familyName.trim() || !nickname.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(familyName.trim(), nickname.trim());
      setFamilyName('');
      setNickname('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText style={styles.cardTitle}>创建家庭</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.description}>
        创建一个家庭账本，生成邀请码分享给朋友
      </ThemedText>

      <View style={styles.field}>
        <ThemedText style={styles.label}>家庭名称</ThemedText>
        <TextInput
          style={styles.input}
          value={familyName}
          onChangeText={setFamilyName}
          placeholder="例如：我们的小家"
          placeholderTextColor="#9E9E9E"
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>你的昵称</ThemedText>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="例如：小明"
          placeholderTextColor="#9E9E9E"
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: '#4CAF50' },
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleSubmit}
        disabled={submitting || loading}
      >
        <ThemedText style={styles.buttonText}>
          {submitting ? '创建中...' : '创建家庭'}
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
