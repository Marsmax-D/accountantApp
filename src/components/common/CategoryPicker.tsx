import { StyleSheet, Pressable, ScrollView, Modal, View } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Category } from '@/types/transaction';

interface Props {
  categories: Category[];
  selectedId: number | null;
  onSelect: (category: Category) => void;
  visible: boolean;
  onClose: () => void;
}

export function CategoryPicker({ categories, selectedId, onSelect, visible, onClose }: Props) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <ThemedView style={styles.sheet}>
          <View style={styles.handle} />
          <ThemedText style={styles.sheetTitle}>选择分类</ThemedText>
          <ScrollView style={styles.list}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [
                  styles.item,
                  { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
                  selectedId === cat.id && { backgroundColor: theme.backgroundElement },
                ]}
                onPress={() => {
                  onSelect(cat);
                  onClose();
                }}
              >
                <View style={[styles.dot, { backgroundColor: cat.color ?? '#999' }]} />
                <ThemedText style={styles.itemText}>{cat.name}</ThemedText>
                {selectedId === cat.id && (
                  <ThemedText style={styles.check}>✓</ThemedText>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </ThemedView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 12,
  },
  list: {
    paddingHorizontal: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
    flex: 1,
  },
  check: {
    fontSize: 16,
    fontWeight: '600',
  },
});
