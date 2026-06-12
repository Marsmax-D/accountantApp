import { StyleSheet, Pressable, Modal, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  destructive,
}: Props) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onCancel}>
        <ThemedView style={styles.dialog}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.message}>{message}</ThemedText>
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={onCancel}
            >
              <ThemedText style={styles.cancelText}>{cancelText}</ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                { backgroundColor: destructive ? '#FF3B30' : theme.text },
                pressed && { opacity: 0.8 },
              ]}
              onPress={onConfirm}
            >
              <ThemedText style={[styles.confirmText, { color: theme.background }]}>
                {confirmText}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 40,
  },
  dialog: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {},
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
