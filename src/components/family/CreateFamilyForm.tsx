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

  const disabled = submitting || loading;

  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardIcon}>🏠</ThemedText>
        <ThemedText style={styles.cardTitle}>创建家庭</ThemedText>
      </View>
      <ThemedText style={styles.description}>
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
        style={({ pressed }) => [styles.button, disabled && { opacity: 0.5 }, pressed && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={disabled}
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
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    opacity: 0.5,
    lineHeight: 18,
  },
  field: {
    gap: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#212121',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
